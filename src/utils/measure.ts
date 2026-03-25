import * as Cesium from 'cesium'

export function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} km`
  }
  return `${distance.toFixed(2)} m`
}

export function formatArea(area: number): string {
  if (area >= 1_000_000) {
    return `${(area / 1_000_000).toFixed(2)} km^2`
  }
  return `${area.toFixed(2)} m^2`
}

export function calculateSpatialDistance(positions: Cesium.Cartesian3[]): number {
  if (positions.length < 2) return 0

  let total = 0
  for (let index = 1; index < positions.length; index += 1) {
    total += Cesium.Cartesian3.distance(positions[index - 1], positions[index])
  }
  return total
}

export function calculateHorizontalDistance(positions: Cesium.Cartesian3[]): number {
  if (positions.length < 2) return 0

  let total = 0
  for (let index = 1; index < positions.length; index += 1) {
    const start = Cesium.Cartographic.fromCartesian(positions[index - 1])
    const end = Cesium.Cartographic.fromCartesian(positions[index])
    const geodesic = new Cesium.EllipsoidGeodesic(start, end)
    total += geodesic.surfaceDistance
  }
  return total
}

export function calculateHeightDifference(start: Cesium.Cartesian3, end: Cesium.Cartesian3): number {
  const startCartographic = Cesium.Cartographic.fromCartesian(start)
  const endCartographic = Cesium.Cartographic.fromCartesian(end)
  return Math.abs(endCartographic.height - startCartographic.height)
}

export function calculatePolygonArea(positions: Cesium.Cartesian3[]): number {
  if (positions.length < 3) return 0

  const center = Cesium.BoundingSphere.fromPoints(positions).center
  const frame = Cesium.Transforms.eastNorthUpToFixedFrame(center)
  const inverseFrame = Cesium.Matrix4.inverse(frame, new Cesium.Matrix4())
  const projected = positions.map((position) =>
    Cesium.Matrix4.multiplyByPoint(inverseFrame, position, new Cesium.Cartesian3())
  )

  let area = 0
  for (let index = 0; index < projected.length; index += 1) {
    const current = projected[index]
    const next = projected[(index + 1) % projected.length]
    area += current.x * next.y - next.x * current.y
  }

  return Math.abs(area) / 2
}

export function calculateCentroid(positions: Cesium.Cartesian3[]): Cesium.Cartesian3 {
  return Cesium.BoundingSphere.fromPoints(positions).center
}
