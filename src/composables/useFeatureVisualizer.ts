import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesiumStore'

type FeatureBoundsResult = {
  exact: boolean
  bottomPoint: Cesium.Cartesian3
  sphere: Cesium.BoundingSphere
}

type RuntimeFeatureMatch = {
  exact: boolean
  bottomPoint: Cesium.Cartesian3
  sphere: Cesium.BoundingSphere
}

type LocalFeatureGeometry = {
  bottomPoint: Cesium.Cartesian3
  sphere: Cesium.BoundingSphere
}

type CesiumInternalsType = typeof Cesium & {
  ModelReader?: {
    readAttributeAsTypedArray: (attribute: any) => ArrayLike<number>
    readIndicesAsTriangleIndicesTypedArray: (indices: any, primitiveType: number) => ArrayLike<number>
  }
}

const CesiumInternals = Cesium as CesiumInternalsType

/**
 * 构件可视化：包围球线框 + 离地测量线 + 距离标注
 */
export function useFeatureVisualizer() {
  const cesiumStore = useCesiumStore()

  // 当前可视化实体
  let entities: Cesium.Entity[] = []

  function getFeatureNumericId(feature: Cesium.Cesium3DTileFeature): number | null {
    const raw = (feature as any).featureId ?? (feature as any)._featureId ?? (feature as any)._batchId
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw
    }

    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }

  function getModelFeatureIdLabel(model: any): string | null {
    return model?.featureIdLabel ?? model?._featureIdLabel ?? 'featureId_0'
  }

  function getModelPropertyTableId(model: any): number | null {
    const raw = model?.featureTableId ?? model?._featureTableId
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
  }

  function isFeatureIdAttributeSet(featureIdSet: any): boolean {
    return featureIdSet?.setIndex !== undefined
  }

  function isFeatureIdImplicitRange(featureIdSet: any): boolean {
    return featureIdSet?.offset !== undefined || featureIdSet?.repeat !== undefined
  }

  function isFeatureIdTextureSet(featureIdSet: any): boolean {
    return featureIdSet?.textureReader !== undefined
  }

  function getPrimitiveFeatureIdSet(primitive: any, model: any): any | null {
    const featureIds = primitive?.featureIds
    if (!Array.isArray(featureIds) || featureIds.length === 0) {
      return null
    }

    const featureIdLabel = getModelFeatureIdLabel(model)
    if (featureIdLabel) {
      const matched = featureIds.find((set: any) => set?.positionalLabel === featureIdLabel || set?.label === featureIdLabel)
      if (matched) {
        return matched
      }
    }

    return featureIds[0] ?? null
  }

  function getPositionAttribute(primitive: any): any | null {
    const attributes = primitive?.attributes
    if (!Array.isArray(attributes)) {
      return null
    }

    return attributes.find((attribute: any) => attribute?.semantic === 'POSITION') ?? null
  }

  function getFeatureIdAttribute(primitive: any, featureIdSet: any): any | null {
    if (!isFeatureIdAttributeSet(featureIdSet)) {
      return null
    }

    const attributes = primitive?.attributes
    if (!Array.isArray(attributes)) {
      return null
    }

    return attributes.find((attribute: any) => (
      attribute?.semantic === '_FEATURE_ID'
      && attribute?.setIndex === featureIdSet.setIndex
    )) ?? null
  }

  function readAttributeTypedArray(attribute: any): ArrayLike<number> | null {
    if (!attribute) {
      return null
    }

    if (attribute.typedArray) {
      return attribute.typedArray as ArrayLike<number>
    }

    const modelReader = CesiumInternals.ModelReader
    if (!modelReader?.readAttributeAsTypedArray) {
      return null
    }

    try {
      return modelReader.readAttributeAsTypedArray(attribute)
    }
    catch {
      return null
    }
  }

  function readTriangleIndices(primitive: any): ArrayLike<number> | null {
    if (!primitive?.indices) {
      return null
    }

    const modelReader = CesiumInternals.ModelReader
    if (modelReader?.readIndicesAsTriangleIndicesTypedArray) {
      try {
        return modelReader.readIndicesAsTriangleIndicesTypedArray(primitive.indices, primitive.primitiveType)
      }
      catch {
        return null
      }
    }

    return primitive.indices.typedArray ? primitive.indices.typedArray as ArrayLike<number> : null
  }

  function featureIdSetCanContainFeature(primitive: any, featureIdSet: any, featureId: number, propertyTableId: number | null): boolean {
    if (!featureIdSet) {
      return false
    }

    if (propertyTableId !== null && featureIdSet.propertyTableId !== propertyTableId) {
      return false
    }

    if (typeof featureIdSet.featureCount === 'number' && featureIdSet.featureCount > 0) {
      if (isFeatureIdAttributeSet(featureIdSet) || isFeatureIdTextureSet(featureIdSet)) {
        if (featureId < 0 || featureId >= featureIdSet.featureCount) {
          return false
        }
      }
      else if (isFeatureIdImplicitRange(featureIdSet)) {
        const offset = Number(featureIdSet.offset ?? 0)
        if (featureId < offset || featureId >= offset + featureIdSet.featureCount) {
          return false
        }
      }
    }

    if (isFeatureIdAttributeSet(featureIdSet)) {
      const featureIdAttribute = getFeatureIdAttribute(primitive, featureIdSet)
      const featureIds = readAttributeTypedArray(featureIdAttribute)
      if (!featureIds) {
        return false
      }

      for (let i = 0; i < featureIds.length; i++) {
        if (Number(featureIds[i]) === featureId) {
          return true
        }
      }
      return false
    }

    if (isFeatureIdImplicitRange(featureIdSet)) {
      return true
    }

    return isFeatureIdTextureSet(featureIdSet) && featureIdSet.featureCount === 1
  }

  function includeVertexInGeometry(
    positions: ArrayLike<number>,
    vertexIndex: number,
    geometry: {
      count: number
      lowestHeight: number
      lowestPoint: Cesium.Cartesian3 | null
      max: Cesium.Cartesian3
      min: Cesium.Cartesian3
    },
    worldMatrix: Cesium.Matrix4,
  ) {
    const offset = vertexIndex * 3
    if (offset + 2 >= positions.length) {
      return
    }

    const x = Number(positions[offset])
    const y = Number(positions[offset + 1])
    const z = Number(positions[offset + 2])
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      return
    }

    const worldPoint = Cesium.Matrix4.multiplyByPoint(
      worldMatrix,
      Cesium.Cartesian3.fromElements(x, y, z, new Cesium.Cartesian3()),
      new Cesium.Cartesian3(),
    )
    const worldHeight = getCartesianHeight(worldPoint)

    if (geometry.count === 0) {
      Cesium.Cartesian3.fromElements(x, y, z, geometry.min)
      Cesium.Cartesian3.fromElements(x, y, z, geometry.max)
      geometry.lowestPoint = worldPoint
      geometry.lowestHeight = worldHeight
      geometry.count = 1
      return
    }

    geometry.min.x = Math.min(geometry.min.x, x)
    geometry.min.y = Math.min(geometry.min.y, y)
    geometry.min.z = Math.min(geometry.min.z, z)
    geometry.max.x = Math.max(geometry.max.x, x)
    geometry.max.y = Math.max(geometry.max.y, y)
    geometry.max.z = Math.max(geometry.max.z, z)
    if (worldHeight < geometry.lowestHeight) {
      geometry.lowestHeight = worldHeight
      geometry.lowestPoint = worldPoint
    }
    geometry.count++
  }

  function buildLocalFeatureGeometry(geometry: {
    count: number
    lowestHeight: number
    lowestPoint: Cesium.Cartesian3 | null
    max: Cesium.Cartesian3
    min: Cesium.Cartesian3
  }): LocalFeatureGeometry | null {
    if (geometry.count === 0 || !geometry.lowestPoint) {
      return null
    }

    return {
      bottomPoint: Cesium.Cartesian3.clone(geometry.lowestPoint, new Cesium.Cartesian3()),
      sphere: Cesium.BoundingSphere.fromCornerPoints(geometry.min, geometry.max, new Cesium.BoundingSphere()),
    }
  }

  function computeBoundsFromFeatureIdAttribute(
    primitive: any,
    featureIdSet: any,
    featureId: number,
    worldMatrix: Cesium.Matrix4,
  ): LocalFeatureGeometry | null {
    const positionAttribute = getPositionAttribute(primitive)
    const featureIdAttribute = getFeatureIdAttribute(primitive, featureIdSet)
    const positions = readAttributeTypedArray(positionAttribute)
    const featureIds = readAttributeTypedArray(featureIdAttribute)
    if (!positionAttribute || !positions || !featureIds) {
      return null
    }

    const geometry = {
      count: 0,
      lowestPoint: null as Cesium.Cartesian3 | null,
      lowestHeight: Number.POSITIVE_INFINITY,
      min: new Cesium.Cartesian3(),
      max: new Cesium.Cartesian3(),
    }
    const vertexCount = Math.min(positionAttribute.count ?? 0, featureIds.length)
    for (let i = 0; i < vertexCount; i++) {
      if (Number(featureIds[i]) !== featureId) {
        continue
      }
      includeVertexInGeometry(positions, i, geometry, worldMatrix)
    }

    return buildLocalFeatureGeometry(geometry)
  }

  function computeBoundsFromImplicitRange(
    primitive: any,
    featureIdSet: any,
    featureId: number,
    worldMatrix: Cesium.Matrix4,
  ): LocalFeatureGeometry | null {
    const positionAttribute = getPositionAttribute(primitive)
    const positions = readAttributeTypedArray(positionAttribute)
    if (!positionAttribute || !positions) {
      return null
    }

    const offset = Number(featureIdSet.offset ?? 0)
    const repeat = Math.max(1, Number(featureIdSet.repeat ?? 1))
    const geometry = {
      count: 0,
      lowestPoint: null as Cesium.Cartesian3 | null,
      lowestHeight: Number.POSITIVE_INFINITY,
      min: new Cesium.Cartesian3(),
      max: new Cesium.Cartesian3(),
    }

    const triangleIndices = readTriangleIndices(primitive)
    if (triangleIndices) {
      for (let cursor = 0; cursor < triangleIndices.length; cursor += 3) {
        const triangleFeatureId = offset + Math.floor(cursor / repeat)
        if (triangleFeatureId !== featureId) {
          continue
        }

        includeVertexInGeometry(positions, Number(triangleIndices[cursor]), geometry, worldMatrix)
        if (cursor + 1 < triangleIndices.length) {
          includeVertexInGeometry(positions, Number(triangleIndices[cursor + 1]), geometry, worldMatrix)
        }
        if (cursor + 2 < triangleIndices.length) {
          includeVertexInGeometry(positions, Number(triangleIndices[cursor + 2]), geometry, worldMatrix)
        }
      }
    }
    else {
      const vertexCount = positionAttribute.count ?? 0
      for (let i = 0; i < vertexCount; i++) {
        const currentFeatureId = offset + Math.floor(i / repeat)
        if (currentFeatureId !== featureId) {
          continue
        }
        includeVertexInGeometry(positions, i, geometry, worldMatrix)
      }
    }

    return buildLocalFeatureGeometry(geometry)
  }

  function computeWholePrimitiveGeometry(primitive: any, worldMatrix: Cesium.Matrix4): LocalFeatureGeometry | null {
    const positionAttribute = getPositionAttribute(primitive)
    const positions = readAttributeTypedArray(positionAttribute)
    if (!positionAttribute || !positions) {
      return null
    }

    const geometry = {
      count: 0,
      lowestPoint: null as Cesium.Cartesian3 | null,
      lowestHeight: Number.POSITIVE_INFINITY,
      min: new Cesium.Cartesian3(),
      max: new Cesium.Cartesian3(),
    }
    const vertexCount = positionAttribute.count ?? 0
    for (let i = 0; i < vertexCount; i++) {
      includeVertexInGeometry(positions, i, geometry, worldMatrix)
    }

    return buildLocalFeatureGeometry(geometry)
  }

  function computeLocalFeatureGeometry(
    primitive: any,
    featureIdSet: any,
    featureId: number,
    worldMatrix: Cesium.Matrix4,
  ): LocalFeatureGeometry | null {
    if (isFeatureIdAttributeSet(featureIdSet)) {
      return computeBoundsFromFeatureIdAttribute(primitive, featureIdSet, featureId, worldMatrix)
    }

    if (isFeatureIdImplicitRange(featureIdSet)) {
      return computeBoundsFromImplicitRange(primitive, featureIdSet, featureId, worldMatrix)
    }

    return null
  }

  function getRuntimePrimitiveModelMatrix(model: any, runtimeNode: any, runtimePrimitive: any): Cesium.Matrix4 | null {
    const drawCommand = runtimePrimitive?.drawCommand
    if (drawCommand?.modelMatrix) {
      return drawCommand.modelMatrix as Cesium.Matrix4
    }

    const sceneGraph = model?._sceneGraph
    const computedModelMatrix = sceneGraph?._computedModelMatrix ?? sceneGraph?.computedModelMatrix
    if (computedModelMatrix && runtimeNode?.computedTransform) {
      return Cesium.Matrix4.multiplyTransformation(
        computedModelMatrix,
        runtimeNode.computedTransform,
        new Cesium.Matrix4(),
      )
    }

    return null
  }

  function getRuntimePrimitiveWorldSphere(
    model: any,
    runtimeNode: any,
    runtimePrimitive: any,
    localSphere?: Cesium.BoundingSphere | null,
  ): Cesium.BoundingSphere | null {
    const drawCommand = runtimePrimitive?.drawCommand
    if (!localSphere && drawCommand?.boundingVolume) {
      return Cesium.BoundingSphere.clone(drawCommand.boundingVolume as Cesium.BoundingSphere, new Cesium.BoundingSphere())
    }

    const sourceSphere = localSphere ?? runtimePrimitive?.boundingSphere
    if (!sourceSphere?.radius || sourceSphere.radius <= 0) {
      return null
    }

    const modelMatrix = getRuntimePrimitiveModelMatrix(model, runtimeNode, runtimePrimitive)
    if (!modelMatrix) {
      return null
    }

    return Cesium.BoundingSphere.transform(sourceSphere, modelMatrix, new Cesium.BoundingSphere())
  }

  function getCartesianHeight(point: Cesium.Cartesian3): number {
    const cartographic = Cesium.Cartographic.fromCartesian(point)
    return cartographic?.height ?? Number.POSITIVE_INFINITY
  }

  /**
   * 尝试从 Cesium 内部模型结构获取单个构件的包围球（世界坐标）。
   * 只有拿到“单构件”级别的精确包围球才返回；避免再落到整块 tile 上出现相同高度。
   */
  function getFeatureBoundsFromInternal(feature: Cesium.Cesium3DTileFeature): FeatureBoundsResult | null {
    const model = (feature as any)._content?._model
    const runtimeNodes = model?._sceneGraph?._runtimeNodes
    const featureId = getFeatureNumericId(feature)
    if (!model || !Array.isArray(runtimeNodes) || featureId === null) {
      return null
    }

    const propertyTableId = getModelPropertyTableId(model)
    const matches: RuntimeFeatureMatch[] = []

    for (const runtimeNode of runtimeNodes) {
      if (!runtimeNode?.runtimePrimitives?.length) {
        continue
      }

      for (const runtimePrimitive of runtimeNode.runtimePrimitives) {
        const primitive = runtimePrimitive?.primitive
        const runtimeWorldMatrix = getRuntimePrimitiveModelMatrix(model, runtimeNode, runtimePrimitive)
        const featureIdSet = getPrimitiveFeatureIdSet(primitive, model)
        if (!runtimeWorldMatrix || !featureIdSet || !featureIdSetCanContainFeature(primitive, featureIdSet, featureId, propertyTableId)) {
          continue
        }

        const localGeometry = computeLocalFeatureGeometry(primitive, featureIdSet, featureId, runtimeWorldMatrix)
        if (localGeometry) {
          const worldSphere = getRuntimePrimitiveWorldSphere(model, runtimeNode, runtimePrimitive, localGeometry.sphere)
          if (worldSphere) {
            matches.push({ exact: true, bottomPoint: localGeometry.bottomPoint, sphere: worldSphere })
          }
          continue
        }

        // featureCount 为 1 说明整个 primitive 就是一个构件，直接按整个 primitive 的几何最低点计算。
        if (featureIdSet.featureCount === 1) {
          const wholePrimitiveGeometry = computeWholePrimitiveGeometry(primitive, runtimeWorldMatrix)
          if (!wholePrimitiveGeometry) {
            continue
          }

          const worldSphere = getRuntimePrimitiveWorldSphere(model, runtimeNode, runtimePrimitive, wholePrimitiveGeometry.sphere)
          if (worldSphere) {
            matches.push({ exact: true, bottomPoint: wholePrimitiveGeometry.bottomPoint, sphere: worldSphere })
          }
        }
      }
    }

    if (matches.length === 0) {
      return null
    }

    if (matches.length === 1) {
      return {
        exact: matches[0].exact,
        bottomPoint: matches[0].bottomPoint,
        sphere: matches[0].sphere,
      }
    }

    const lowestMatch = matches.reduce((currentLowest, match) => {
      return getCartesianHeight(match.bottomPoint) < getCartesianHeight(currentLowest.bottomPoint)
        ? match
        : currentLowest
    })

    return {
      exact: matches.every(match => match.exact),
      bottomPoint: lowestMatch.bottomPoint,
      sphere: Cesium.BoundingSphere.fromBoundingSpheres(
        matches.map(match => match.sphere),
        new Cesium.BoundingSphere(),
      ),
    }
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
   * 显示单个构件的包围球线框、垂直测量线和离地标注。
   * 离地高度按构件几何最低点到地面的垂直距离计算。
   *
   * @param feature 选中的构件
   * @returns 离地高度（米），失败返回 null
   */
  function show(feature: Cesium.Cesium3DTileFeature): number | null {
    const viewer = cesiumStore.viewer
    if (!viewer) return null

    clear()
    const resolved = getFeatureBoundsFromInternal(feature)

    // 没拿到精确包围球时，宁可不显示，也不再回退到 tile 级包围球误导高度。
    if (!resolved?.exact) {
      return null
    }

    const bs = resolved.sphere
    const center = bs.center
    const radius = bs.radius
    const bottomPos = resolved.bottomPoint
    const bottomCarto = Cesium.Cartographic.fromCartesian(bottomPos, viewer.scene.globe.ellipsoid)
    if (!bottomCarto) {
      return null
    }

    // 地面高度按构件底部计算，更符合“离地高度”的语义。
    const terrainH = viewer.scene.globe.getHeight(bottomCarto)
    const groundH = terrainH !== undefined ? bottomCarto.height - terrainH : null

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
        bottomCarto.longitude, bottomCarto.latitude, terrainH,
      )

      // 虚线
      entities.push(viewer.entities.add({
        polyline: {
          positions: [bottomPos, groundPos],
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
      const midPos = Cesium.Cartesian3.midpoint(bottomPos, groundPos, new Cesium.Cartesian3())
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
