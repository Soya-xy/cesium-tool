import { ref, onUnmounted } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'
import { cartesianToCoordinate } from '@/utils/coordinate'
import { ElMessage } from 'element-plus'
import { useDrawingTools } from '@/composables/useDrawingTools'
import { useInteractionStore } from '@/stores/interactionStore'

export interface ContextMenuItem {
  index: string
  icon: string
  label: string
  children?: ContextMenuItem[]
  action?: () => void
}

export function useContextMenu() {
  const cesiumStore = useCesiumStore()
  const drawingTools = useDrawingTools()
  const interactionStore = useInteractionStore()
  const menuVisible = ref(false)
  const menuX = ref(0)
  const menuY = ref(0)
  const clickCoordinate = ref({ lon: 0, lat: 0, height: 0 })

  let handler: Cesium.ScreenSpaceEventHandler | null = null

  function setupContextMenu() {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    handler?.destroy()
    handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      if (interactionStore.consumeContextMenuBlock()) return
      if (interactionStore.isDrawing) return

      // 将画布坐标转换为视口坐标
      const canvas = viewer.scene.canvas
      const rect = canvas.getBoundingClientRect()
      menuX.value = movement.position.x + rect.left
      menuY.value = movement.position.y + rect.top

      const cartesian = viewer.scene.pickPosition(movement.position)
        ?? viewer.scene.globe.pick(viewer.camera.getPickRay(movement.position)!, viewer.scene)

      if (cartesian) {
        const coord = cartesianToCoordinate(cartesian)
        clickCoordinate.value = {
          lon: coord.longitude,
          lat: coord.latitude,
          height: coord.height,
        }
      }

      menuVisible.value = true
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    // 左键点击关闭菜单
    handler.setInputAction(() => {
      menuVisible.value = false
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  function getMenuItems(): ContextMenuItem[] {
    const viewer = cesiumStore.viewer

    function activateTool(mode: Parameters<typeof drawingTools.startTool>[0]) {
      drawingTools.startTool(mode)
      menuVisible.value = false
    }

    return [
      {
        index: 'coordinate',
        icon: 'Location',
        label: '查看此处坐标',
        action: () => {
          const { lon, lat, height } = clickCoordinate.value
          const text = `${lon.toFixed(6)}, ${lat.toFixed(6)}, ${height.toFixed(2)}`
          navigator.clipboard.writeText(text)
          ElMessage.success(`坐标已复制: ${text}`)
          menuVisible.value = false
        },
      },
      {
        index: 'camera',
        icon: 'Camera',
        label: '查看当前视角',
        action: () => {
          if (!viewer) return
          const cam = viewer.camera
          const carto = Cesium.Cartographic.fromCartesian(cam.positionWC)
          const info = {
            longitude: +Cesium.Math.toDegrees(carto.longitude).toFixed(6),
            latitude: +Cesium.Math.toDegrees(carto.latitude).toFixed(6),
            height: +carto.height.toFixed(2),
            heading: +Cesium.Math.toDegrees(cam.heading).toFixed(2),
            pitch: +Cesium.Math.toDegrees(cam.pitch).toFixed(2),
            roll: +Cesium.Math.toDegrees(cam.roll).toFixed(2),
          }
          navigator.clipboard.writeText(JSON.stringify(info, null, 2))
          ElMessage.success('视角参数已复制到剪贴板')
          menuVisible.value = false
        },
      },
      {
        index: 'measure',
        icon: 'Lollipop',
        label: '图上量算',
        children: [
          { index: 'measure-space', icon: 'Rank', label: '空间距离', action: () => activateTool('measure-space') },
          { index: 'measure-horizontal', icon: 'Minus', label: '水平距离', action: () => activateTool('measure-horizontal') },
          { index: 'measure-area', icon: 'Grid', label: '面积量算', action: () => activateTool('measure-area') },
          { index: 'measure-height', icon: 'Sort', label: '高度差', action: () => activateTool('measure-height') },
        ],
      },
      {
        index: 'mark',
        icon: 'MapLocation',
        label: '图上标记',
        children: [
          { index: 'mark-point', icon: 'LocationFilled', label: '点标记', action: () => activateTool('mark-point') },
          { index: 'mark-line', icon: 'Share', label: '线标记', action: () => activateTool('mark-line') },
          { index: 'mark-polygon', icon: 'CopyDocument', label: '面标记', action: () => activateTool('mark-polygon') },
          { index: 'mark-text', icon: 'EditPen', label: '文字标注', action: () => activateTool('mark-text') },
        ],
      },
      {
        index: 'view',
        icon: 'View',
        label: '视角切换',
        children: [
          {
            index: 'view-top', icon: 'Download', label: '俯视图', action: () => {
              if (!viewer) return
              viewer.camera.flyTo({
                destination: viewer.camera.positionWC,
                orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
              })
              menuVisible.value = false
            },
          },
          {
            index: 'view-south', icon: 'Right', label: '正南视角', action: () => {
              if (!viewer) return
              viewer.camera.flyTo({
                destination: viewer.camera.positionWC,
                orientation: { heading: Cesium.Math.toRadians(180), pitch: 0, roll: 0 },
              })
              menuVisible.value = false
            },
          },
          {
            index: 'view-reset', icon: 'RefreshRight', label: '重置视角', action: () => {
              if (!viewer) return
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 15000000),
                duration: 1.5,
              })
              menuVisible.value = false
            },
          },
        ],
      },
      {
        index: 'effect',
        icon: 'MagicStick',
        label: '特效效果',
        children: [
          {
            index: 'effect-bloom', icon: 'Sunny', label: 'Bloom 泛光', action: () => {
              if (!viewer) return
              viewer.scene.postProcessStages.bloom.enabled = !viewer.scene.postProcessStages.bloom.enabled
              ElMessage.success(`Bloom ${viewer.scene.postProcessStages.bloom.enabled ? '开启' : '关闭'}`)
              menuVisible.value = false
            },
          },
          {
            index: 'effect-fxaa', icon: 'PictureFilled', label: 'FXAA 抗锯齿', action: () => {
              if (!viewer) return
              viewer.scene.postProcessStages.fxaa.enabled = !viewer.scene.postProcessStages.fxaa.enabled
              ElMessage.success(`FXAA ${viewer.scene.postProcessStages.fxaa.enabled ? '开启' : '关闭'}`)
              menuVisible.value = false
            },
          },
          {
            index: 'effect-shadow', icon: 'Cloudy', label: '实时阴影', action: () => {
              if (!viewer) return
              viewer.shadows = !viewer.shadows
              ElMessage.success(`阴影 ${viewer.shadows ? '开启' : '关闭'}`)
              menuVisible.value = false
            },
          },
        ],
      },
      {
        index: 'terrain',
        icon: 'Histogram',
        label: '地形服务',
        children: [
          {
            index: 'terrain-depth', icon: 'View', label: '深度检测', action: () => {
              if (!viewer) return
              viewer.scene.globe.depthTestAgainstTerrain = !viewer.scene.globe.depthTestAgainstTerrain
              ElMessage.success(`深度检测 ${viewer.scene.globe.depthTestAgainstTerrain ? '开启' : '关闭'}`)
              menuVisible.value = false
            },
          },
        ],
      },
      {
        index: 'scene',
        icon: 'Setting',
        label: '场景设置',
        children: [
          {
            index: 'scene-atmosphere', icon: 'Cloudy', label: '大气层', action: () => {
              if (!viewer) return
              viewer.scene.globe.showGroundAtmosphere = !viewer.scene.globe.showGroundAtmosphere
              ElMessage.success(`大气层 ${viewer.scene.globe.showGroundAtmosphere ? '开启' : '关闭'}`)
              menuVisible.value = false
            },
          },
          {
            index: 'scene-sun', icon: 'Sunny', label: '太阳', action: () => {
              if (!viewer || !viewer.scene.sun) return
              viewer.scene.sun.show = !viewer.scene.sun.show
              ElMessage.success(`太阳 ${viewer.scene.sun.show ? '显示' : '隐藏'}`)
              menuVisible.value = false
            },
          },
          {
            index: 'scene-moon', icon: 'Moon', label: '月亮', action: () => {
              if (!viewer || !viewer.scene.moon) return
              viewer.scene.moon.show = !viewer.scene.moon.show
              ElMessage.success(`月亮 ${viewer.scene.moon.show ? '显示' : '隐藏'}`)
              menuVisible.value = false
            },
          },
          {
            index: 'scene-skybox', icon: 'Star', label: '星空', action: () => {
              if (!viewer || !viewer.scene.skyBox) return
              viewer.scene.skyBox.show = !viewer.scene.skyBox.show
              ElMessage.success(`星空 ${viewer.scene.skyBox.show ? '显示' : '隐藏'}`)
              menuVisible.value = false
            },
          },
        ],
      },
    ]
  }

  function closeMenu() {
    menuVisible.value = false
  }

  onUnmounted(() => {
    handler?.destroy()
  })

  return {
    setupContextMenu,
    menuVisible,
    menuX,
    menuY,
    clickCoordinate,
    getMenuItems,
    closeMenu,
    drawingTools,
  }
}
