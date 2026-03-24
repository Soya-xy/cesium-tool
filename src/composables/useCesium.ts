import { ref, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'
import { TIANDITU_IMG_URL, TIANDITU_CIA_URL, TIANDITU_SUBDOMAINS } from '@/config/tianditu'

export function useCesium() {
  const store = useCesiumStore()
  const fps = ref(0)
  const cameraLon = ref(0)
  const cameraLat = ref(0)
  const cameraHeight = ref(0)
  const mouseLon = ref(0)
  const mouseLat = ref(0)
  const mouseHeight = ref(0)
  let fpsInterval: ReturnType<typeof setInterval> | null = null

  function initViewer(container: string | HTMLElement) {
    const viewer = new Cesium.Viewer(container, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayer: false,
      msaaSamples: 4,
    })

    // Tianditu satellite imagery
    viewer.imageryLayers.addImageryProvider(
      new Cesium.WebMapTileServiceImageryProvider({
        url: TIANDITU_IMG_URL,
        layer: 'img',
        style: 'default',
        tileMatrixSetID: 'w',
        format: 'tiles',
        maximumLevel: 18,
        subdomains: TIANDITU_SUBDOMAINS,
      })
    )

    // Tianditu annotation layer
    viewer.imageryLayers.addImageryProvider(
      new Cesium.WebMapTileServiceImageryProvider({
        url: TIANDITU_CIA_URL,
        layer: 'cia',
        style: 'default',
        tileMatrixSetID: 'w',
        format: 'tiles',
        maximumLevel: 18,
        subdomains: TIANDITU_SUBDOMAINS,
      })
    )

    // Enable depth test against terrain
    viewer.scene.globe.depthTestAgainstTerrain = true

    // Default camera - China overview
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 15000000),
      duration: 0,
    })

    // Track mouse position
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const cartesian = viewer.scene.pickPosition(movement.endPosition)
        ?? viewer.scene.globe.pick(viewer.camera.getPickRay(movement.endPosition)!, viewer.scene)
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        mouseLon.value = Cesium.Math.toDegrees(carto.longitude)
        mouseLat.value = Cesium.Math.toDegrees(carto.latitude)
        mouseHeight.value = carto.height
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // Track camera position
    viewer.camera.changed.addEventListener(() => {
      const carto = Cesium.Cartographic.fromCartesian(viewer.camera.positionWC)
      cameraLon.value = Cesium.Math.toDegrees(carto.longitude)
      cameraLat.value = Cesium.Math.toDegrees(carto.latitude)
      cameraHeight.value = carto.height
    })

    // FPS counter
    let frameCount = 0
    viewer.scene.postRender.addEventListener(() => {
      frameCount++
    })
    fpsInterval = setInterval(() => {
      fps.value = frameCount
      frameCount = 0
    }, 1000)

    store.setViewer(viewer)
    return viewer
  }

  onUnmounted(() => {
    if (fpsInterval) clearInterval(fpsInterval)
  })

  return {
    initViewer,
    fps,
    cameraLon,
    cameraLat,
    cameraHeight,
    mouseLon,
    mouseLat,
    mouseHeight,
  }
}
