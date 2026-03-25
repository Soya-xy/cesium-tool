import { defineStore } from 'pinia'
import { ref, shallowRef, markRaw } from 'vue'
import type * as Cesium from 'cesium'

export interface TilesetItem {
  id: string
  name: string
  url: string
  tileset: Cesium.Cesium3DTileset
  visible: boolean
}

export interface FeatureProperty {
  key: string
  value: string
}

export const useTilesetStore = defineStore('tileset', () => {
  const tilesets = ref<TilesetItem[]>([])
  const activeTilesetId = ref<string | null>(null)
  // shallowRef + markRaw: 阻止 Vue DevTools 序列化 Cesium 对象
  const selectedFeature = shallowRef<Cesium.Cesium3DTileFeature | null>(null)
  const featureProperties = shallowRef<FeatureProperty[]>([])
  const pickedPosition = shallowRef<Cesium.Cartesian3 | null>(null)
  const propsLoading = ref(false)

  function addTileset(item: TilesetItem) {
    // markRaw 阻止 Vue 代理 Cesium3DTileset 实例（包含大量 WebGL 资源）
    item.tileset = markRaw(item.tileset) as Cesium.Cesium3DTileset
    tilesets.value.push(item)
    activeTilesetId.value = item.id
  }

  function removeTileset(id: string) {
    const idx = tilesets.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      const item = tilesets.value[idx]
      item.tileset.destroy()
      tilesets.value.splice(idx, 1)
      if (activeTilesetId.value === id) {
        activeTilesetId.value = tilesets.value[0]?.id ?? null
      }
    }
  }

  /** 设置选中的要素和位置，在下一个宏任务中读取属性（非阻塞）。 */
  function setSelectedFeature(feature: Cesium.Cesium3DTileFeature | null, position: Cesium.Cartesian3 | null) {
    // markRaw 阻止 Vue DevTools 序列化 Cesium3DTileFeature 和 Cartesian3
    selectedFeature.value = feature ? markRaw(feature) as Cesium.Cesium3DTileFeature : null
    pickedPosition.value = position ? markRaw(position) as Cesium.Cartesian3 : null

    if (!feature) {
      featureProperties.value = []
      propsLoading.value = false
      return
    }

    propsLoading.value = true
    featureProperties.value = []

    // 延迟读取属性，避免阻塞主线程
    const feat = feature
    setTimeout(() => {
      if (selectedFeature.value !== feat) return
      try {
        const ids = feat.getPropertyIds()
        const props: FeatureProperty[] = new Array(ids.length)
        for (let i = 0; i < ids.length; i++) {
          props[i] = { key: ids[i], value: String(feat.getProperty(ids[i])) }
        }
        // Object.freeze 阻止 Vue 对数组项添加响应式代理
        featureProperties.value = Object.freeze(props) as any
      } catch {
        featureProperties.value = []
      }
      propsLoading.value = false
    }, 16)
  }

  function clearSelection() {
    selectedFeature.value = null
    pickedPosition.value = null
    propsLoading.value = false
    // 不清除 featureProperties —— 弹窗已通过 v-show 隐藏，
    // 清除会触发 Vue VDOM 对 100+ 行的昂贵 diff
  }

  return {
    tilesets,
    activeTilesetId,
    selectedFeature,
    featureProperties,
    pickedPosition,
    propsLoading,
    addTileset,
    removeTileset,
    setSelectedFeature,
    clearSelection,
  }
})
