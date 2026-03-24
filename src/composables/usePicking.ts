import { ref, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'
import { useTilesetStore } from '@/stores/tilesetStore'

export function usePicking() {
  const cesiumStore = useCesiumStore()
  const tilesetStore = useTilesetStore()

  const popupVisible = ref(false)
  const popupX = ref(0)
  const popupY = ref(0)

  let handler: Cesium.ScreenSpaceEventHandler | null = null
  let highlighted: { feature: Cesium.Cesium3DTileFeature | null; originalColor: Cesium.Color } = {
    feature: null,
    originalColor: new Cesium.Color(),
  }
  let selected: { feature: Cesium.Cesium3DTileFeature | null; originalColor: Cesium.Color } = {
    feature: null,
    originalColor: new Cesium.Color(),
  }

  function setupPicking() {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    // Hover highlight
    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      // Restore previous highlight
      if (highlighted.feature) {
        highlighted.feature.color = highlighted.originalColor
        highlighted.feature = null
      }

      const picked = viewer.scene.pick(movement.endPosition)
      if (!Cesium.defined(picked) || !(picked instanceof Cesium.Cesium3DTileFeature)) return

      // Don't highlight if already selected
      if (picked === selected.feature) return

      highlighted.feature = picked
      Cesium.Color.clone(picked.color, highlighted.originalColor)
      picked.color = Cesium.Color.YELLOW.withAlpha(0.6)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // Left-click select
    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      // Restore previous selection
      if (selected.feature) {
        selected.feature.color = selected.originalColor
        selected.feature = null
      }
      tilesetStore.clearSelection()
      popupVisible.value = false

      const picked = viewer.scene.pick(movement.position)
      if (!Cesium.defined(picked) || !(picked instanceof Cesium.Cesium3DTileFeature)) return

      // Set new selection
      selected.feature = picked
      if (picked === highlighted.feature) {
        Cesium.Color.clone(highlighted.originalColor, selected.originalColor)
        highlighted.feature = null
      } else {
        Cesium.Color.clone(picked.color, selected.originalColor)
      }
      picked.color = Cesium.Color.CYAN.withAlpha(0.7)

      // Get pick position
      const cartesian = viewer.scene.pickPosition(movement.position)
      tilesetStore.setSelectedFeature(picked, cartesian ?? null)

      // Update popup position
      if (cartesian) {
        const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, cartesian)
        if (canvasPos) {
          popupX.value = canvasPos.x
          popupY.value = canvasPos.y
          popupVisible.value = true
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // Update popup position on camera move
    viewer.scene.postRender.addEventListener(() => {
      if (!popupVisible.value || !tilesetStore.pickedPosition) return
      const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        tilesetStore.pickedPosition
      )
      if (canvasPos) {
        popupX.value = canvasPos.x
        popupY.value = canvasPos.y
      }
    })
  }

  function clearPicking() {
    if (selected.feature) {
      selected.feature.color = selected.originalColor
      selected.feature = null
    }
    if (highlighted.feature) {
      highlighted.feature.color = highlighted.originalColor
      highlighted.feature = null
    }
    tilesetStore.clearSelection()
    popupVisible.value = false
  }

  onUnmounted(() => {
    handler?.destroy()
  })

  return {
    setupPicking,
    clearPicking,
    popupVisible,
    popupX,
    popupY,
  }
}
