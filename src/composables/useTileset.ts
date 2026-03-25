import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'
import { useTilesetStore, type TilesetItem } from '@/stores/tilesetStore'

let idCounter = 0

export function useTileset() {
  const cesiumStore = useCesiumStore()
  const tilesetStore = useTilesetStore()

  async function loadTileset(url: string, name?: string): Promise<TilesetItem | null> {
    const viewer = cesiumStore.viewer
    if (!viewer) return null

    // 防止重复加载相同的 URL
    const existing = tilesetStore.tilesets.find(t => t.url === url)
    if (existing) {
      viewer.zoomTo(existing.tileset, new Cesium.HeadingPitchRange(0, -0.5, 0))
      tilesetStore.activeTilesetId = existing.id
      return existing
    }

    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
        maximumScreenSpaceError: 16,
      })

      viewer.scene.primitives.add(tileset)

      const item: TilesetItem = {
        id: `tileset_${++idCounter}`,
        name: name || url.split('/').slice(-2, -1)[0] || `模型_${idCounter}`,
        url,
        tileset,
        visible: true,
      }

      tilesetStore.addTileset(item)

      // 飞行到 tileset
      viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0, -0.5, 0))

      return item
    } catch (e) {
      console.error('Failed to load tileset:', e)
      throw e
    }
  }

  function removeTileset(id: string) {
    const viewer = cesiumStore.viewer
    if (!viewer) return
    const item = tilesetStore.tilesets.find(t => t.id === id)
    if (item) {
      viewer.scene.primitives.remove(item.tileset)
      tilesetStore.removeTileset(id)
    }
  }

  function toggleVisibility(id: string) {
    const item = tilesetStore.tilesets.find(t => t.id === id)
    if (item) {
      item.visible = !item.visible
      item.tileset.show = item.visible
    }
  }

  function flyToTileset(id: string) {
    const viewer = cesiumStore.viewer
    if (!viewer) return
    const item = tilesetStore.tilesets.find(t => t.id === id)
    if (item) {
      viewer.zoomTo(item.tileset, new Cesium.HeadingPitchRange(0, -0.5, 0))
    }
  }

  // Tileset 属性编辑
  function updateTilesetProperty(id: string, prop: string, value: any) {
    const item = tilesetStore.tilesets.find(t => t.id === id)
    if (!item) return
    const ts = item.tileset as any
    if (prop in ts) {
      ts[prop] = value
    }
  }

  return {
    loadTileset,
    removeTileset,
    toggleVisibility,
    flyToTileset,
    updateTilesetProperty,
  }
}
