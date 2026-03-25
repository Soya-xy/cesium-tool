import { defineStore } from 'pinia'
import { shallowRef, markRaw } from 'vue'
import type * as Cesium from 'cesium'

export const useCesiumStore = defineStore('cesium', () => {
  const viewer = shallowRef<Cesium.Viewer | null>(null)

  function setViewer(v: Cesium.Viewer) {
    // markRaw 阻止 Vue/DevTools 深度代理 Cesium Viewer（巨大的 WebGL 对象树）
    viewer.value = markRaw(v)
  }

  function destroyViewer() {
    if (viewer.value && !viewer.value.isDestroyed()) {
      viewer.value.destroy()
    }
    viewer.value = null
  }

  return { viewer, setViewer, destroyViewer }
})
