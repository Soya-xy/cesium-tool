import { ref, markRaw } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'

/** 建筑信息（来自 floor.json） */
export interface BuildingInfo {
  id: string
  name: string
  position: { lng: number; lat: number }
  coordinates: number[][]
  floorH: number
}

/** 楼层信息 */
export interface FloorInfo {
  index: number           // 楼层序号 (1-based)
  label: string           // 显示名 (F1, F2...)
  url: string             // tileset.json 路径
  tileset: Cesium.Cesium3DTileset | null
  visible: boolean
  loaded: boolean
  heightCenter: number    // 楼层中心高度 (来自包围盒)
  heightBottom: number    // 楼层底部高度
  heightTop: number       // 楼层顶部高度
}

export function useBimFloor() {
  const cesiumStore = useCesiumStore()
  const buildings = ref<BuildingInfo[]>([])
  const floors = ref<FloorInfo[]>([])
  const floorMode = ref(false)     // 是否处于分层模式
  const loading = ref(false)

  /** 从 floor.json 加载建筑信息 */
  async function loadBuildingInfo(baseUrl: string) {
    try {
      const floorJsonUrl = baseUrl.replace('tileset.json', 'floor.json')
      const res = await fetch(floorJsonUrl)
      if (!res.ok) return
      const data = await res.json()
      buildings.value = data.builds || []
    } catch {
      buildings.value = []
    }
  }

  /** 扫描并初始化楼层信息（检查 F1-F20 目录是否存在 tileset.json） */
  async function initFloors(baseUrl: string) {
    loading.value = true
    const basePath = baseUrl.replace('tileset.json', '')
    const found: FloorInfo[] = []

    // 探测 F1 到 F20
    for (let i = 1; i <= 20; i++) {
      const url = `${basePath}F${i}/tileset.json`
      try {
        const res = await fetch(url, { method: 'HEAD' })
        if (res.ok) {
          found.push({
            index: i,
            label: `F${i}`,
            url,
            tileset: null,
            visible: false,
            loaded: false,
            heightCenter: 0,
            heightBottom: 0,
            heightTop: 0,
          })
        }
      } catch {
        // 不存在，跳过
      }
    }

    floors.value = found
    loading.value = false

    // 同时加载建筑信息
    await loadBuildingInfo(baseUrl)
  }

  /** 加载单个楼层的 3DTiles */
  async function loadFloor(floorInfo: FloorInfo) {
    const viewer = cesiumStore.viewer
    if (!viewer || floorInfo.loaded) return

    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(floorInfo.url, {
        maximumScreenSpaceError: 16,
      })
      markRaw(tileset)
      viewer.scene.primitives.add(tileset)

      // 从包围盒提取高度信息
      const center = tileset.boundingSphere.center
      const carto = Cesium.Cartographic.fromCartesian(center)
      const radius = tileset.boundingSphere.radius

      floorInfo.tileset = tileset
      floorInfo.loaded = true
      floorInfo.visible = true
      floorInfo.heightCenter = carto.height
      floorInfo.heightBottom = carto.height - radius * 0.3  // 近似值
      floorInfo.heightTop = carto.height + radius * 0.3
    } catch (e) {
      console.error(`加载楼层 ${floorInfo.label} 失败:`, e)
    }
  }

  /** 进入分层模式 —— 隐藏整体模型，加载并显示各楼层 */
  async function enterFloorMode(mainTileset: Cesium.Cesium3DTileset) {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    floorMode.value = true
    loading.value = true

    // 隐藏整体模型
    mainTileset.show = false

    // 加载所有楼层
    for (const floor of floors.value) {
      await loadFloor(floor)
    }

    loading.value = false

    // 飞到楼层概览
    if (floors.value.length > 0 && floors.value[0].tileset) {
      viewer.zoomTo(floors.value[0].tileset, new Cesium.HeadingPitchRange(0, -0.5, 0))
    }
  }

  /** 退出分层模式 —— 显示整体模型，卸载楼层 */
  function exitFloorMode(mainTileset: Cesium.Cesium3DTileset) {
    const viewer = cesiumStore.viewer
    if (!viewer) return

    floorMode.value = false

    // 卸载所有楼层
    for (const floor of floors.value) {
      if (floor.tileset) {
        viewer.scene.primitives.remove(floor.tileset)
        floor.tileset = null
        floor.loaded = false
        floor.visible = false
      }
    }

    // 显示整体模型
    mainTileset.show = true
  }

  /** 切换单个楼层显示/隐藏 */
  function toggleFloor(floorInfo: FloorInfo) {
    if (!floorInfo.tileset) return
    floorInfo.visible = !floorInfo.visible
    floorInfo.tileset.show = floorInfo.visible
  }

  /** 飞到某一楼层 */
  function flyToFloor(floorInfo: FloorInfo) {
    const viewer = cesiumStore.viewer
    if (!viewer || !floorInfo.tileset) return
    viewer.zoomTo(floorInfo.tileset, new Cesium.HeadingPitchRange(0, -0.4, 0))
  }

  /** 只显示某一楼层，隐藏其他 */
  function isolateFloor(floorInfo: FloorInfo) {
    for (const f of floors.value) {
      if (f.tileset) {
        f.visible = f.index === floorInfo.index
        f.tileset.show = f.visible
      }
    }
    flyToFloor(floorInfo)
  }

  /** 显示所有楼层 */
  function showAllFloors() {
    for (const f of floors.value) {
      if (f.tileset) {
        f.visible = true
        f.tileset.show = true
      }
    }
  }

  /** 根据构件所在的 tileset 判断其所属楼层 */
  function getFloorByTileset(tileset: Cesium.Cesium3DTileset): FloorInfo | null {
    if (!floorMode.value) return null
    return floors.value.find(f => f.tileset === tileset) ?? null
  }

  return {
    buildings,
    floors,
    floorMode,
    loading,
    initFloors,
    enterFloorMode,
    exitFloorMode,
    toggleFloor,
    flyToFloor,
    isolateFloor,
    showAllFloors,
    getFloorByTileset,
  }
}
