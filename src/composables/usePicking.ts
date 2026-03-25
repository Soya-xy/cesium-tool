import { ref, onUnmounted, watch } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'
import { useTilesetStore } from '@/stores/tilesetStore'
import { useBimFloor } from '@/composables/useBimFloor'
import { useFeatureVisualizer } from '@/composables/useFeatureVisualizer'
import { useInteractionStore } from '@/stores/interactionStore'

export function usePicking() {
  const cesiumStore = useCesiumStore()
  const tilesetStore = useTilesetStore()
  const bimFloor = useBimFloor()
  const visualizer = useFeatureVisualizer()
  const interactionStore = useInteractionStore()

  const popupVisible = ref(false)
  const popupX = ref(0)
  const popupY = ref(0)
  const hoverHighlight = ref(false)

  let handler: Cesium.ScreenSpaceEventHandler | null = null
  let highlighted: { feature: Cesium.Cesium3DTileFeature | null; originalColor: Cesium.Color } = {
    feature: null,
    originalColor: new Cesium.Color(),
  }
  let selected: { feature: Cesium.Cesium3DTileFeature | null; originalColor: Cesium.Color } = {
    feature: null,
    originalColor: new Cesium.Color(),
  }

  // 追踪待执行的延迟操作，避免竞态
  let pendingRestoreTimer: ReturnType<typeof setTimeout> | null = null
  let pendingColorTimer: ReturnType<typeof setTimeout> | null = null

  function clearPendingTimers() {
    if (pendingRestoreTimer !== null) { clearTimeout(pendingRestoreTimer); pendingRestoreTimer = null }
    if (pendingColorTimer !== null) { clearTimeout(pendingColorTimer); pendingColorTimer = null }
  }

  function clearHighlight() {
    if (highlighted.feature) {
      try { highlighted.feature.color = highlighted.originalColor } catch {}
      highlighted.feature = null
    }
  }

  function setupPicking() {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    handler?.destroy()
    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    // 鼠标悬停高亮（由开关控制）
    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      if (interactionStore.isDrawing) {
        clearHighlight()
        return
      }
      if (!hoverHighlight.value) {
        clearHighlight()
        return
      }
      clearHighlight()
      const picked = viewer.scene.pick(movement.endPosition)
      if (!Cesium.defined(picked) || !(picked instanceof Cesium.Cesium3DTileFeature)) return
      if (picked === selected.feature) return
      highlighted.feature = picked
      Cesium.Color.clone(picked.color, highlighted.originalColor)
      picked.color = Cesium.Color.YELLOW.withAlpha(0.6)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 左键点击选择
    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      // 取消前一次点击的待执行操作，避免快速连续点击时的竞态
      clearPendingTimers()
      if (interactionStore.isDrawing) {
        popupVisible.value = false
        return
      }
      // === 同步阶段：仅执行快速操作（无 GPU 操作） ===

      // === 同步阶段 ===

      // 1. 隐藏弹窗
      popupVisible.value = false

      // 2. 保存前一个要素引用
      const prevFeature = selected.feature
      const prevOrigColor = Cesium.Color.clone(selected.originalColor, new Cesium.Color())
      selected.feature = null

      // 3. scene.pick()
      const picked = viewer.scene.pick(movement.position)
      if (!Cesium.defined(picked) || !(picked instanceof Cesium.Cesium3DTileFeature)) {
        // 点击空白 —— 立即恢复前一个构件颜色
        if (prevFeature) {
          try { prevFeature.color = prevOrigColor } catch {}
        }
        tilesetStore.clearSelection()
        visualizer.clear()
        return
      }

      // 4. 保存原始颜色
      selected.feature = picked
      if (picked === prevFeature) {
        // 重新点击同一构件 —— 保持已保存的原始颜色（避免保存 CYAN）
        Cesium.Color.clone(prevOrigColor, selected.originalColor)
      } else if (picked === highlighted.feature) {
        // 点击了悬停高亮的构件 —— 使用高亮前的原始颜色
        Cesium.Color.clone(highlighted.originalColor, selected.originalColor)
        highlighted.feature = null
      } else {
        Cesium.Color.clone(picked.color, selected.originalColor)
      }

      // 保存点击位置
      const clickPos = Cesium.Cartesian2.clone(movement.position)

      // === 异步阶段 ===

      // 第1帧：弹窗 + 选中状态 + 可视化
      setTimeout(() => {
        const cartesian = viewer.scene.pickPosition(clickPos)
        if (cartesian) {
          const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, cartesian)
          if (canvasPos) {
            popupX.value = Math.round(canvasPos.x)
            popupY.value = Math.round(canvasPos.y)
          }
        }
        popupVisible.value = true
        tilesetStore.setSelectedFeature(picked, cartesian ?? null)

        // 楼层检测
        const floor = bimFloor.getFloorByTileset(picked.tileset)
        tilesetStore.featureFloorLabel = floor ? floor.label : null

        // 显示包围球 + 离地测量线（优先真实构件/瓦片包围球，不再用点击位置伪造）
        const groundH = visualizer.show(picked)
        tilesetStore.featureGroundHeight = groundH
      }, 0)

      // 第2帧：恢复前一个构件颜色
      if (prevFeature && prevFeature !== picked) {
        pendingRestoreTimer = setTimeout(() => {
          pendingRestoreTimer = null
          try { prevFeature.color = prevOrigColor } catch {}
        }, 50)
      }

      // 第3帧：设置选中颜色
      pendingColorTimer = setTimeout(() => {
        pendingColorTimer = null
        if (selected.feature === picked) {
          try { picked.color = Cesium.Color.CYAN.withAlpha(0.7) } catch {}
        }
      }, 100)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    watch(
      () => interactionStore.isDrawing,
      (isDrawing) => {
        if (isDrawing) {
          clearPicking()
          clearHighlight()
        }
      }
    )
  }

  function clearPicking() {
    clearPendingTimers()

    // 1. 隐藏弹窗
    popupVisible.value = false
    tilesetStore.clearSelection()
    visualizer.clear()

    // 2. 恢复颜色
    const feat = selected.feature
    const origColor = Cesium.Color.clone(selected.originalColor, new Cesium.Color())
    selected.feature = null

    const hFeat = highlighted.feature
    const hColor = Cesium.Color.clone(highlighted.originalColor, new Cesium.Color())
    highlighted.feature = null

    if (feat || hFeat) {
      setTimeout(() => {
        if (feat) { try { feat.color = origColor } catch {} }
        if (hFeat) { try { hFeat.color = hColor } catch {} }
      }, 0)
    }
  }

  onUnmounted(() => {
    clearPendingTimers()
    handler?.destroy()
  })

  return {
    setupPicking,
    clearPicking,
    popupVisible,
    popupX,
    popupY,
    hoverHighlight,
  }
}
