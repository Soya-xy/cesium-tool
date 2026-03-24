import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
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
  const selectedFeature = shallowRef<Cesium.Cesium3DTileFeature | null>(null)
  const featureProperties = ref<FeatureProperty[]>([])
  const pickedPosition = shallowRef<Cesium.Cartesian3 | null>(null)

  function addTileset(item: TilesetItem) {
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

  function setSelectedFeature(feature: Cesium.Cesium3DTileFeature | null, position: Cesium.Cartesian3 | null) {
    selectedFeature.value = feature
    pickedPosition.value = position
    if (feature) {
      const ids = feature.getPropertyIds()
      featureProperties.value = ids.map(id => ({
        key: id,
        value: String(feature.getProperty(id)),
      }))
    } else {
      featureProperties.value = []
    }
  }

  function clearSelection() {
    selectedFeature.value = null
    pickedPosition.value = null
    featureProperties.value = []
  }

  return {
    tilesets,
    activeTilesetId,
    selectedFeature,
    featureProperties,
    pickedPosition,
    addTileset,
    removeTileset,
    setSelectedFeature,
    clearSelection,
  }
})
