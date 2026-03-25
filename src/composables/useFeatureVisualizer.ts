import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'

/**
 * 构件可视化：包围球线框 + 离地测量线 + 距离标注
 * 通过构件 ID 缓存结果，保证同一构件多次点击离地高度一致。
 */
export function useFeatureVisualizer() {
  const cesiumStore = useCesiumStore()

  // 当前可视化实体
  let entities: Cesium.Entity[] = []

  // 按构件 ID 缓存包围球（同一构件无论点击哪个位置，结果一致）
  const boundsCache = new Map<string, Cesium.BoundingSphere>()

  /** 生成构件唯一标识：tile URL + batchId */
  function getCacheKey(feature: Cesium.Cesium3DTileFeature): string {
    const f = feature as any
    const url = f._content?._tile?._contentUrl || f._content?.url || ''
    const batchId = f._batchId ?? -1
    return `${url}__${batchId}`
  }

  /** 清除所有可视化实体 */
  function clear() {
    const viewer = cesiumStore.viewer
    if (!viewer) return
    for (const e of entities) {
      viewer.entities.remove(e)
    }
    entities = []
  }

  /**
   * 尝试从 Cesium 内部模型结构获取单个构件的包围球（世界坐标）。
   * 多种内部路径尝试，全部失败返回 null。
   */
  function getFeatureBoundsFromInternal(feature: Cesium.Cesium3DTileFeature): Cesium.BoundingSphere | null {
    const f = feature as any
    const batchId = f._batchId
    const content = f._content
    const model = content?._model
    if (!model || batchId == null) return null

    const modelMatrix = model.modelMatrix || Cesium.Matrix4.IDENTITY

    // 方式1：runtime node 直接映射
    try {
      const nodes = model._sceneGraph?._runtimeNodes
      if (nodes?.length > batchId) {
        const node = nodes[batchId]
        const bs = node?._boundingSphere || node?.computedBoundingSphere
        if (bs?.radius > 0) {
          const worldCenter = Cesium.Matrix4.multiplyByPoint(
            modelMatrix, bs.center, new Cesium.Cartesian3(),
          )
          return new Cesium.BoundingSphere(worldCenter, bs.radius)
        }
      }
    } catch { /* 降级 */ }

    // 方式2：遍历 components nodes，按 index 匹配
    try {
      const compNodes = model._loader?._components?.nodes
      if (compNodes) {
        for (const node of compNodes) {
          if (node.index === batchId || node.name === String(batchId)) {
            // 尝试从 node 的 primitives 获取包围球
            if (node.primitives?.length) {
              for (const prim of node.primitives) {
                if (prim.boundingSphere?.radius > 0) {
                  const worldCenter = Cesium.Matrix4.multiplyByPoint(
                    modelMatrix, prim.boundingSphere.center, new Cesium.Cartesian3(),
                  )
                  return new Cesium.BoundingSphere(worldCenter, prim.boundingSphere.radius)
                }
              }
            }
            // 尝试 node 的 translation
            if (node.translation) {
              const t = node.translation
              const localCenter = new Cesium.Cartesian3(t.x ?? t[0], t.y ?? t[1], t.z ?? t[2])
              const worldCenter = Cesium.Matrix4.multiplyByPoint(
                modelMatrix, localCenter, new Cesium.Cartesian3(),
              )
              return new Cesium.BoundingSphere(worldCenter, 2)
            }
          }
        }
      }
    } catch { /* 降级 */ }

    // 方式3：runtime primitives 中找比 tile 小的
    try {
      const rps = model._sceneGraph?._runtimePrimitives
      const tileR = content?._tile?.boundingSphere?.radius ?? Infinity
      if (rps?.length) {
        for (const rp of rps) {
          const bs = rp?._boundingSphere
          if (bs?.radius > 0 && bs.radius < tileR * 0.3) {
            const worldCenter = Cesium.Matrix4.multiplyByPoint(
              modelMatrix, bs.center, new Cesium.Cartesian3(),
            )
            return new Cesium.BoundingSphere(worldCenter, bs.radius)
          }
        }
      }
    } catch { /* 降级 */ }

    return null
  }

  /** 估算包围球半径 */
  function estimateRadius(feature: Cesium.Cesium3DTileFeature): number {
    try {
      const content = (feature as any)._content
      const tile = content?._tile
      if (tile?.boundingSphere && content?.featuresLength > 1) {
        return tile.boundingSphere.radius / Math.cbrt(content.featuresLength)
      }
      if (tile?.boundingSphere) {
        return tile.boundingSphere.radius * 0.1
      }
    } catch { /* 降级 */ }
    return 3
  }

  /**
   * 显示单个构件的包围球线框、垂直测量线和离地标注。
   * 同一构件（相同 ID）无论点击哪里，离地高度和包围球始终一致。
   *
   * @param feature 选中的构件
   * @param pickedPosition 点击位置（仅首次降级时使用，后续从缓存读取）
   * @returns 离地高度（米），失败返回 null
   */
  function show(feature: Cesium.Cesium3DTileFeature, pickedPosition?: Cesium.Cartesian3): number | null {
    const viewer = cesiumStore.viewer
    if (!viewer) return null

    clear()

    const key = getCacheKey(feature)
    let bs: Cesium.BoundingSphere

    // 1. 优先读缓存（保证同一构件结果一致）
    const cached = boundsCache.get(key)
    if (cached) {
      bs = cached
    } else {
      // 2. 尝试内部 API 获取精确包围球
      const internal = getFeatureBoundsFromInternal(feature)
      if (internal) {
        bs = internal
      } else {
        // 3. 降级：以点击位置为中心，估算半径，缓存后不再变化
        const center = pickedPosition || feature.tileset.boundingSphere.center
        const radius = estimateRadius(feature)
        bs = new Cesium.BoundingSphere(center, radius)
      }
      boundsCache.set(key, bs)
    }

    const center = bs.center
    const radius = bs.radius
    const carto = Cesium.Cartographic.fromCartesian(center)

    // 地面高度（基于构件包围球中心，同一构件始终一致）
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
