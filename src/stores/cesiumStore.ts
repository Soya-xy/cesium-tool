import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type * as Cesium from 'cesium'

export const useCesiumStore = defineStore('cesium', () => {
  const viewer = shallowRef<Cesium.Viewer | null>(null)

  function setViewer(v: Cesium.Viewer) {
    viewer.value = v
  }

  function destroyViewer() {
    if (viewer.value && !viewer.value.isDestroyed()) {
      viewer.value.destroy()
    }
    viewer.value = null
  }

  return { viewer, setViewer, destroyViewer }
})
