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

  function clearHighlight() {
    if (highlighted.feature) {
      try { highlighted.feature.color = highlighted.originalColor } catch {}
      highlighted.feature = null
    }
  }

  function updatePopupScreenPosition(viewer: Cesium.Viewer) {
    if (!popupVisible.value || !tilesetStore.pickedPosition) return
    const canvasPos = Cesium.SceneTransforms.worldToWindowCoordinates(
      viewer.scene,
      tilesetStore.pickedPosition,
    )
    if (canvasPos) {
      const nx = Math.round(canvasPos.x)
      const ny = Math.round(canvasPos.y)
      if (nx !== popupX.value || ny !== popupY.value) {
        popupX.value = nx
        popupY.value = ny
      }
    }
  }

  function setupPicking() {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    // 鼠标悬停高亮（由开关控制）
    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
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
      // === 同步阶段：仅执行快速操作（无 GPU 操作） ===

      // 1. 立即隐藏弹窗
      popupVisible.value = false

      // 2. 保存前一个要素引用（暂不恢复颜色 —— 那是昂贵的操作）
      const prevFeature = selected.feature
      const prevOrigColor = Cesium.Color.clone(selected.originalColor, new Cesium.Color())
      selected.feature = null

      // 3. scene.pick() —— 同步 GPU 拾取操作，无法避免
      const picked = viewer.scene.pick(movement.position)
      if (!Cesium.defined(picked) || !(picked instanceof Cesium.Cesium3DTileFeature)) {
        // 点击了空白区域
        if (prevFeature) {
          setTimeout(() => { try { prevFeature.color = prevOrigColor } catch {} }, 0)
        }
        tilesetStore.clearSelection()
        return
      }

      // 4. 保存新拾取对象的原始颜色（快速 —— 只是读取缓存值）
      selected.feature = picked
      if (picked === highlighted.feature) {
        Cesium.Color.clone(highlighted.originalColor, selected.originalColor)
        highlighted.feature = null
      } else {
        Cesium.Color.clone(picked.color, selected.originalColor)
      }

      // 保存点击位置供延迟使用
      const clickPos = Cesium.Cartesian2.clone(movement.position)

      // === 异步阶段：将昂贵的操作分散到多帧中 ===

      // 第1帧（下一个 tick）：显示弹窗及位置 + 开始加载指示器
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
      }, 0)

      // 第2帧：恢复前一个要素的颜色（昂贵 —— 创建/更新批量纹理）
      setTimeout(() => {
        if (prevFeature && prevFeature !== picked) {
          try { prevFeature.color = prevOrigColor } catch {}
        }
      }, 50)

      // 第3帧：设置新的选中颜色（昂贵 —— 同样的原因）
      setTimeout(() => {
        if (selected.feature === picked) {
          try { picked.color = Cesium.Color.CYAN.withAlpha(0.7) } catch {}
        }
      }, 100)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // 仅在相机移动时更新弹窗位置
    viewer.camera.changed.addEventListener(() => {
      updatePopupScreenPosition(viewer)
    })
  }

  function clearPicking() {
    // 1. 立即隐藏弹窗（即时 UI 反馈）
    popupVisible.value = false
    tilesetStore.clearSelection()

    // 2. 延迟执行昂贵的颜色恢复操作，避免阻塞关闭动画
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
