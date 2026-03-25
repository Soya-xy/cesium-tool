import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'

/**
 * 构件可视化：包围球线框 + 离地测量线 + 距离标注
 * 基于构件所在 tile 的包围球计算，保证同一构件的离地高度一致。
 */
export function useFeatureVisualizer() {
  const cesiumStore = useCesiumStore()

  // 当前可视化实体
  let entities: Cesium.Entity[] = []

  /** 清除所有可视化实体 */
  function clear() {
    const viewer = cesiumStore.viewer
    if (!viewer) return
    for (const e of entities) {
      viewer.entities.remove(e)
    }
    entities = []
  }

  /** 获取构件所在 tile 的包围球（降级到 tileset 级别） */
  function getFeatureBoundingSphere(feature: Cesium.Cesium3DTileFeature): Cesium.BoundingSphere {
    try {
      const tile = (feature as any)._content?._tile
      if (tile?.boundingSphere) {
        return tile.boundingSphere as Cesium.BoundingSphere
      }
    } catch { /* 降级 */ }
    return feature.tileset.boundingSphere
  }

  /**
   * 显示构件的包围球线框、垂直测量线和离地标注
   * 返回基于包围球中心计算的离地高度
   */
  function show(feature: Cesium.Cesium3DTileFeature): number | null {
    const viewer = cesiumStore.viewer
    if (!viewer) return null

    clear()

    const bs = getFeatureBoundingSphere(feature)
    const center = bs.center
    const radius = bs.radius
    const carto = Cesium.Cartographic.fromCartesian(center)

    // 地面高度（地形采样）
    const terrainH = viewer.scene.globe.getHeight(carto)
    const groundH = terrainH !== undefined ? carto.height - terrainH : null

    // 1. 包围球线框
    entities.push(viewer.entities.add({
      position: center,
      ellipsoid: {
        radii: new Cesium.Cartesian3(radius, radius, radius),
        fill: false,
        outline: true,
        outlineColor: Cesium.Color.CYAN.withAlpha(0.5),
        slicePartitions: 16,
        stackPartitions: 8,
      },
    }))

    // 2. 垂直测量线 + 地面标记 + 距离标注
    if (terrainH !== undefined && groundH !== null) {
      const groundPos = Cesium.Cartesian3.fromRadians(
        carto.longitude, carto.latitude, terrainH,
      )

      // 虚线
      entities.push(viewer.entities.add({
        polyline: {
          positions: [center, groundPos],
          width: 2,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.YELLOW,
            dashLength: 8,
          }),
          depthFailMaterial: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.YELLOW.withAlpha(0.3),
            dashLength: 8,
          }),
        },
      }))

      // 地面点
      entities.push(viewer.entities.add({
        position: groundPos,
        point: {
          pixelSize: 8,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }))

      // 距离标注（放在线段中点）
      const midPos = Cesium.Cartesian3.midpoint(center, groundPos, new Cesium.Cartesian3())
      entities.push(viewer.entities.add({
        position: midPos,
        label: {
          text: `离地 ${groundH.toFixed(2)}m`,
          font: '13px sans-serif',
          fillColor: Cesium.Color.WHITE,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
          backgroundPadding: new Cesium.Cartesian2(8, 4),
          pixelOffset: new Cesium.Cartesian2(15, 0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }))
    }

    return groundH
  }

  return { show, clear }
}
