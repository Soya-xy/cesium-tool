import { onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import { ElMessage } from 'element-plus'
import { useCesiumStore } from '@/stores/cesiumStore'
import { useInteractionStore, type DrawingMode } from '@/stores/interactionStore'
import {
  createHeightPreviewEntity,
  createLineMark,
  createLinePreviewEntity,
  createPointMark,
  createPolygonMark,
  createPolygonPreviewEntities,
  createPreviewLabelEntity,
  createPreviewPointEntity,
  createTextMark,
  finalizeAreaMeasurement,
  finalizeDistanceMeasurement,
  finalizeHeightMeasurement,
  getPreviewLabelText,
} from '@/utils/drawingEntities'

type MultiPointMode =
  | 'measure-space'
  | 'measure-horizontal'
  | 'measure-area'
  | 'measure-height'
  | 'mark-line'
  | 'mark-polygon'

const TOOL_MESSAGE: Record<DrawingMode, string> = {
  'measure-space': '空间距离量算已开启：左键依次取点，右键结束。',
  'measure-horizontal': '水平距离量算已开启：左键依次取点，右键结束。',
  'measure-area': '面积量算已开启：左键依次取点，右键结束。',
  'measure-height': '高度差量算已开启：左键选择起点和终点。',
  'mark-point': '点标记已开启：左键单击地图添加标记。',
  'mark-line': '线标记已开启：左键依次取点，右键结束。',
  'mark-polygon': '面标记已开启：左键依次取点，右键结束。',
  'mark-text': '文字标注已开启：左键选择位置后输入内容。',
}

export function useDrawingTools() {
  const cesiumStore = useCesiumStore()
  const interactionStore = useInteractionStore()

  let handler: Cesium.ScreenSpaceEventHandler | null = null
  let activePoints: Cesium.Cartesian3[] = []
  let hoverPosition: Cesium.Cartesian3 | null = null
  let previewPoint: Cesium.Entity | null = null
  let previewShape: Cesium.Entity | null = null
  let previewOutline: Cesium.Entity | null = null
  let previewLabel: Cesium.Entity | null = null
  let previewText = ''

  function setupDrawingTools() {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    handler?.destroy()
    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const mode = interactionStore.activeMode
      if (!mode) return

      const position = pickWorldPosition(movement.position)
      if (!position) {
        ElMessage.warning('当前鼠标位置未拾取到有效地理位置。')
        return
      }

      if (mode === 'mark-point') {
        createPointMark(viewer, position)
        finishTool('点标记已添加。')
        return
      }

      if (mode === 'mark-text') {
        const text = window.prompt('请输入标注内容', '文字标注')?.trim()
        if (!text) {
          cleanupPreview()
          interactionStore.stopDrawing()
          ElMessage.info('文字标注已取消。')
          return
        }
        createTextMark(viewer, position, text)
        finishTool('文字标注已添加。')
        return
      }

      activePoints.push(position)

      if (mode === 'measure-height' && activePoints.length >= 2) {
        finalizeHeightMeasurement(viewer, activePoints[0], activePoints[1])
        finishTool('高度差量算已完成。')
        return
      }

      ensurePreviewEntities(mode)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const mode = interactionStore.activeMode
      if (!mode || activePoints.length === 0) return

      const position = pickWorldPosition(movement.endPosition)
      if (!position) return

      hoverPosition = position
      ensurePreviewEntities(mode)
      updatePreviewLabel(mode)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    handler.setInputAction(() => {
      const mode = interactionStore.activeMode
      if (!mode) return
      interactionStore.blockContextMenuOnce()

      if (!isMultiPointMode(mode)) {
        cleanupPreview()
        interactionStore.stopDrawing()
        return
      }

      if (mode === 'measure-height') {
        cancelActiveTool('高度差量算已取消。')
        return
      }

      const finalPoints = getDynamicPositions()
      const minPoints = getMinimumPoints(mode)
      if (finalPoints.length < minPoints) {
        cancelActiveTool('绘制点数不足，已取消当前操作。')
        return
      }

      if (mode === 'measure-space') {
        finalizeDistanceMeasurement(viewer, finalPoints, 'space')
        finishTool('空间距离量算已完成。')
        return
      }

      if (mode === 'measure-horizontal') {
        finalizeDistanceMeasurement(viewer, finalPoints, 'horizontal')
        finishTool('水平距离量算已完成。')
        return
      }

      if (mode === 'measure-area') {
        finalizeAreaMeasurement(viewer, finalPoints)
        finishTool('面积量算已完成。')
        return
      }

      if (mode === 'mark-line') {
        createLineMark(viewer, finalPoints)
        finishTool('线标记已添加。')
        return
      }

      if (mode === 'mark-polygon') {
        createPolygonMark(viewer, finalPoints)
        finishTool('面标记已添加。')
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
  }

  function startTool(mode: DrawingMode) {
    if (!cesiumStore.viewer) {
      ElMessage.warning('Cesium 场景尚未初始化。')
      return
    }

    cleanupPreview()
    interactionStore.startDrawing(mode)
    ElMessage.info(TOOL_MESSAGE[mode])
  }

  function cancelActiveTool(message?: string) {
    cleanupPreview()
    interactionStore.stopDrawing()
    if (message) {
      ElMessage.info(message)
    }
  }

  function finishTool(message: string) {
    cleanupPreview()
    interactionStore.stopDrawing()
    ElMessage.success(message)
  }

  function pickWorldPosition(windowPosition: Cesium.Cartesian2): Cesium.Cartesian3 | null {
    const viewer = cesiumStore.viewer
    if (!viewer) return null

    const pickedPosition = viewer.scene.pickPosition(windowPosition)
    if (Cesium.defined(pickedPosition)) {
      return pickedPosition
    }

    const ray = viewer.camera.getPickRay(windowPosition)
    if (!ray) return null

    return viewer.scene.globe.pick(ray, viewer.scene) ?? null
  }

  function ensurePreviewEntities(mode: DrawingMode) {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    if (!previewPoint && hoverPosition) {
      previewPoint = createPreviewPointEntity(viewer, () => hoverPosition)
    }

    if (!previewLabel && activePoints.length > 0) {
      previewLabel = createPreviewLabelEntity(
        viewer,
        () => hoverPosition ?? activePoints[activePoints.length - 1] ?? null,
        () => previewText,
      )
    }

    if (mode === 'measure-area' || mode === 'mark-polygon') {
      ensurePolygonPreview()
      return
    }

    if (mode === 'measure-height') {
      ensureHeightPreview()
      return
    }

    ensureLinePreview()
  }

  function ensureLinePreview() {
    const viewer = cesiumStore.viewer
    if (!viewer || previewShape) return

    previewShape = createLinePreviewEntity(viewer, () => getDynamicPositions())
  }

  function ensurePolygonPreview() {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    if (!previewShape) {
      const previewEntities = createPolygonPreviewEntities(viewer, () => getDynamicPositions())
      previewShape = previewEntities.polygon
      previewOutline = previewEntities.outline
    }
  }

  function ensureHeightPreview() {
    const viewer = cesiumStore.viewer
    if (!viewer || activePoints.length === 0 || previewShape) return

    previewShape = createHeightPreviewEntity(viewer, () => {
      if (!hoverPosition || activePoints.length === 0) return activePoints
      return [activePoints[0], hoverPosition]
    })
  }

  function updatePreviewLabel(mode: DrawingMode) {
    const positions = getDynamicPositions()
    if (positions.length === 0) return

    previewText = isPreviewableMode(mode)
      ? getPreviewLabelText(mode, positions)
      : ''
  }

  function getDynamicPositions(): Cesium.Cartesian3[] {
    if (hoverPosition) {
      return [...activePoints, hoverPosition]
    }
    return [...activePoints]
  }

  function getMinimumPoints(mode: MultiPointMode): number {
    if (mode === 'measure-area' || mode === 'mark-polygon') return 3
    return 2
  }

  function isMultiPointMode(mode: DrawingMode): mode is MultiPointMode {
    return mode !== 'mark-point' && mode !== 'mark-text'
  }

  function isPreviewableMode(
    mode: DrawingMode,
  ): mode is 'measure-space' | 'measure-horizontal' | 'measure-area' | 'measure-height' | 'mark-line' | 'mark-polygon' {
    return mode !== 'mark-point' && mode !== 'mark-text'
  }

  function cleanupPreview() {
    const viewer = cesiumStore.viewer
    if (viewer) {
      if (previewPoint) viewer.entities.remove(previewPoint)
      if (previewShape) viewer.entities.remove(previewShape)
      if (previewOutline) viewer.entities.remove(previewOutline)
      if (previewLabel) viewer.entities.remove(previewLabel)
    }

    activePoints = []
    hoverPosition = null
    previewText = ''
    previewPoint = null
    previewShape = null
    previewOutline = null
    previewLabel = null
  }

  onUnmounted(() => {
    cleanupPreview()
    handler?.destroy()
  })

  return {
    setupDrawingTools,
    startTool,
    cancelActiveTool,
  }
}
