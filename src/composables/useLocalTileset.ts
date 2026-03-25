import { ref } from 'vue'
import * as Cesium from 'cesium'
import { useTileset } from './useTileset'
import { ElMessage } from 'element-plus'

const LOCAL_TILES_PREFIX = '/__local_tiles__/'
const fileStore = new Map<string, File>()
let interceptInstalled = false

function extractLocalPath(url: string): string {
  const origin = window.location.origin
  const fullPrefix = origin + LOCAL_TILES_PREFIX
  let localPath = ''

  if (url.startsWith(fullPrefix)) {
    localPath = url.slice(fullPrefix.length)
  } else if (url.startsWith(LOCAL_TILES_PREFIX)) {
    localPath = url.slice(LOCAL_TILES_PREFIX.length)
  }

  if (localPath) {
    return decodeURIComponent(localPath.split('?')[0])
  }
  return ''
}

/**
 * 在 Cesium Resource 层级（XHR）拦截请求 —— 这是 Cesium 实际加载瓦片的地方。
 * 同时拦截 window.fetch 作为后备方案。
 */
function installIntercept() {
  if (interceptInstalled) return
  interceptInstalled = true

  // 1. 重写 Cesium 内部的 XHR 加载器（Cesium 使用的主要方法）
  const impl = (Cesium.Resource as any)._Implementations
  if (impl?.loadWithXhr) {
    const originalLoadWithXhr = impl.loadWithXhr
    impl.loadWithXhr = function (
      url: string,
      responseType: string,
      method: string,
      data: any,
      headers: any,
      deferred: { resolve: (val: any) => void; reject: (err: any) => void },
      overrideMimeType: string | undefined,
    ) {
      const localPath = extractLocalPath(url)
      if (localPath && fileStore.has(localPath)) {
        const file = fileStore.get(localPath)!
        file.arrayBuffer().then((buffer) => {
          // 如果期望 JSON 格式，则解析它
          if (responseType === '' || responseType === 'text' || url.endsWith('.json')) {
            const text = new TextDecoder().decode(buffer)
            try {
              deferred.resolve(JSON.parse(text))
            } catch {
              deferred.resolve(text)
            }
          } else {
            deferred.resolve(buffer)
          }
        }).catch((err) => deferred.reject(err))
        return
      }
      return originalLoadWithXhr(url, responseType, method, data, headers, deferred, overrideMimeType)
    }
  }

  // 2. 同时重写 window.fetch 作为后备方案（某些 Cesium 版本使用 fetch）
  const originalFetch = window.fetch
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url

    const localPath = extractLocalPath(url)
    if (localPath && fileStore.has(localPath)) {
      const file = fileStore.get(localPath)!
      const buffer = await file.arrayBuffer()
      const mimeMap: Record<string, string> = {
        json: 'application/json', b3dm: 'application/octet-stream',
        i3dm: 'application/octet-stream', pnts: 'application/octet-stream',
        cmpt: 'application/octet-stream', glb: 'model/gltf-binary',
        gltf: 'model/gltf+json', png: 'image/png', jpg: 'image/jpeg',
        bin: 'application/octet-stream', subtree: 'application/octet-stream',
      }
      const ext = localPath.split('.').pop()?.toLowerCase() ?? ''
      return new Response(buffer, {
        status: 200,
        headers: { 'Content-Type': mimeMap[ext] || 'application/octet-stream' },
      })
    }

    return originalFetch.call(window, input, init)
  }
}

/** 递归读取 FileSystemDirectoryEntry 到文件存储中 */
async function readDirectoryEntry(
  entry: FileSystemDirectoryEntry,
  basePath: string,
): Promise<void> {
  const reader = entry.createReader()
  let allEntries: FileSystemEntry[] = []

  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries((entries) => resolve(entries), reject)
    })
    if (batch.length === 0) break
    allEntries = allEntries.concat(batch)
  }

  for (const child of allEntries) {
    const childPath = basePath ? `${basePath}/${child.name}` : child.name
    if (child.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        ;(child as FileSystemFileEntry).file(resolve, reject)
      })
      fileStore.set(childPath, file)
    } else if (child.isDirectory) {
      await readDirectoryEntry(child as FileSystemDirectoryEntry, childPath)
    }
  }
}

/** 在文件存储中查找 tileset.json */
function findTilesetJson(): string | null {
  // 优先选择路径最短的 tileset.json（最接近根目录）
  const candidates: string[] = []
  for (const key of fileStore.keys()) {
    if (key.endsWith('tileset.json')) {
      candidates.push(key)
    }
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.split('/').length - b.split('/').length)
  return candidates[0]
}

export function useLocalTileset() {
  const { loadTileset } = useTileset()
  const isDragging = ref(false)
  const isProcessing = ref(false)

  installIntercept()

  function onDragEnter(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = true
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { clientX: x, clientY: y } = e
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      isDragging.value = false
    }
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false

    if (!e.dataTransfer?.items) return

    isProcessing.value = true
    fileStore.clear()

    try {
      const items = Array.from(e.dataTransfer.items)
      for (const item of items) {
        if (item.kind !== 'file') continue
        const entry = item.webkitGetAsEntry?.()
        if (!entry) continue

        if (entry.isDirectory) {
          // 存储文件时不包含顶层文件夹名称作为前缀，
          // 这样 tileset.json 中的相对路径能正确解析
          await readDirectoryEntry(entry as FileSystemDirectoryEntry, '')
        } else if (entry.isFile) {
          const file = await new Promise<File>((resolve, reject) => {
            ;(entry as FileSystemFileEntry).file(resolve, reject)
          })
          fileStore.set(entry.name, file)
        }
      }

      const totalFiles = fileStore.size
      if (totalFiles === 0) {
        ElMessage.warning('文件夹为空')
        return
      }

      const tilesetPath = findTilesetJson()
      if (!tilesetPath) {
        ElMessage.error('未找到 tileset.json 文件')
        return
      }

      ElMessage.info(`发现 ${totalFiles} 个文件，正在加载模型...`)

      const url = LOCAL_TILES_PREFIX + tilesetPath
      await loadTileset(url, `📁 本地模型`)

      ElMessage.success(`本地模型加载成功 (${totalFiles} 文件)`)
    } catch (err: any) {
      console.error('Failed to load local tileset:', err)
      ElMessage.error(`加载失败: ${err?.message || '未知错误'}`)
    } finally {
      isProcessing.value = false
    }
  }

  return {
    isDragging,
    isProcessing,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}
