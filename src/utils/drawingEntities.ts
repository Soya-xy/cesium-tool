import * as Cesium from 'cesium'
import { formatCoordinate } from '@/utils/coordinate'
import {
  calculateCentroid,
  calculateHeightDifference,
  calculateHorizontalDistance,
  calculatePolygonArea,
  calculateSpatialDistance,
  formatArea,
  formatDistance,
} from '@/utils/measure'

export const PRIMARY_COLOR = Cesium.Color.fromCssColorString('#38bdf8')
export const ACCENT_COLOR = Cesium.Color.fromCssColorString('#0ea5e9')
export const FILL_COLOR = Cesium.Color.fromCssColorString('#0ea5e9').withAlpha(0.22)
export const LABEL_BACKGROUND = Cesium.Color.fromCssColorString('#16213e').withAlpha(0.88)

export function createPreviewPointEntity(
  viewer: Cesium.Viewer,
  getPosition: () => Cesium.Cartesian3 | null,
) {
  return viewer.entities.add({
    position: new Cesium.CallbackPositionProperty(() => getPosition() ?? undefined, false),
    point: {
      pixelSize: 8,
      color: PRIMARY_COLOR,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function createPreviewLabelEntity(
  viewer: Cesium.Viewer,
  getPosition: () => Cesium.Cartesian3 | null,
  getText: () => string,
) {
  return viewer.entities.add({
    position: new Cesium.CallbackPositionProperty(() => getPosition() ?? undefined, false),
    label: {
      text: new Cesium.CallbackProperty(() => getText(), false),
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: LABEL_BACKGROUND,
      pixelOffset: new Cesium.Cartesian2(0, -28),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function createLinePreviewEntity(
  viewer: Cesium.Viewer,
  getPositions: () => Cesium.Cartesian3[],
) {
  return viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => getPositions(), false),
      width: 3,
      material: PRIMARY_COLOR,
      clampToGround: false,
    },
  })
}

export function createPolygonPreviewEntities(
  viewer: Cesium.Viewer,
  getPositions: () => Cesium.Cartesian3[],
) {
  const polygon = viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.CallbackProperty(() => {
        const positions = getPositions()
        if (positions.length < 3) return undefined
        return new Cesium.PolygonHierarchy(positions)
      }, false),
      material: FILL_COLOR,
      outline: false,
      perPositionHeight: true,
    },
  })

  const outline = viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const positions = getPositions()
        if (positions.length < 2) return positions
        return [...positions, positions[0]]
      }, false),
      width: 2,
      material: PRIMARY_COLOR,
      clampToGround: false,
    },
  })

  return { polygon, outline }
}

export function createHeightPreviewEntity(
  viewer: Cesium.Viewer,
  getPositions: () => Cesium.Cartesian3[],
) {
  return viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => getPositions(), false),
      width: 3,
      material: PRIMARY_COLOR,
      clampToGround: false,
    },
  })
}

export function getPreviewLabelText(
  mode: 'measure-space' | 'measure-horizontal' | 'measure-area' | 'measure-height' | 'mark-line' | 'mark-polygon',
  positions: Cesium.Cartesian3[],
): string {
  if (mode === 'measure-space') {
    return `空间距离 ${formatDistance(calculateSpatialDistance(positions))}`
  }
  if (mode === 'measure-horizontal') {
    return `水平距离 ${formatDistance(calculateHorizontalDistance(positions))}`
  }
  if (mode === 'measure-area' && positions.length >= 3) {
    return `面积 ${formatArea(calculatePolygonArea(positions))}`
  }
  if (mode === 'measure-height' && positions.length >= 2) {
    return `高度差 ${formatDistance(calculateHeightDifference(positions[0], positions[1]))}`
  }
  if (mode === 'mark-line') {
    return `线标记 ${formatDistance(calculateSpatialDistance(positions))}`
  }
  if (mode === 'mark-polygon' && positions.length >= 3) {
    return `面标记 ${formatArea(calculatePolygonArea(positions))}`
  }
  return ''
}

export function createPointMark(viewer: Cesium.Viewer, position: Cesium.Cartesian3) {
  const cartographic = Cesium.Cartographic.fromCartesian(position)
  const longitude = Cesium.Math.toDegrees(cartographic.longitude)
  const latitude = Cesium.Math.toDegrees(cartographic.latitude)
  const height = cartographic.height

  viewer.entities.add({
    position,
    point: {
      pixelSize: 10,
      color: ACCENT_COLOR,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: formatCoordinate(longitude, latitude, height),
      font: '13px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: LABEL_BACKGROUND,
      pixelOffset: new Cesium.Cartesian2(0, -26),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function createTextMark(
  viewer: Cesium.Viewer,
  position: Cesium.Cartesian3,
  text: string,
) {
  viewer.entities.add({
    position,
    point: {
      pixelSize: 8,
      color: PRIMARY_COLOR,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: LABEL_BACKGROUND,
      pixelOffset: new Cesium.Cartesian2(0, -26),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function createLineMark(viewer: Cesium.Viewer, positions: Cesium.Cartesian3[]) {
  const length = formatDistance(calculateSpatialDistance(positions))

  viewer.entities.add({
    polyline: {
      positions,
      width: 3,
      material: PRIMARY_COLOR,
      clampToGround: false,
    },
  })

  viewer.entities.add({
    position: positions[positions.length - 1],
    label: {
      text: `线标记 ${length}`,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: LABEL_BACKGROUND,
      pixelOffset: new Cesium.Cartesian2(0, -26),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function createPolygonMark(viewer: Cesium.Viewer, positions: Cesium.Cartesian3[]) {
  viewer.entities.add({
    polygon: {
      hierarchy: positions,
      material: FILL_COLOR,
      outline: true,
      outlineColor: PRIMARY_COLOR,
      perPositionHeight: true,
    },
  })

  viewer.entities.add({
    position: calculateCentroid(positions),
    label: {
      text: `面标记 ${formatArea(calculatePolygonArea(positions))}`,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: LABEL_BACKGROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function finalizeDistanceMeasurement(
  viewer: Cesium.Viewer,
  positions: Cesium.Cartesian3[],
  type: 'space' | 'horizontal',
) {
  const distance = type === 'space'
    ? calculateSpatialDistance(positions)
    : calculateHorizontalDistance(positions)

  viewer.entities.add({
    polyline: {
      positions,
      width: 3,
      material: type === 'space' ? PRIMARY_COLOR : ACCENT_COLOR,
      clampToGround: false,
    },
  })

  viewer.entities.add({
    position: positions[positions.length - 1],
    label: {
      text: `${type === 'space' ? '空间距离' : '水平距离'} ${formatDistance(distance)}`,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: LABEL_BACKGROUND,
      pixelOffset: new Cesium.Cartesian2(0, -26),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function finalizeAreaMeasurement(viewer: Cesium.Viewer, positions: Cesium.Cartesian3[]) {
  viewer.entities.add({
    polygon: {
      hierarchy: positions,
      material: FILL_COLOR,
      outline: true,
      outlineColor: PRIMARY_COLOR,
      perPositionHeight: true,
    },
  })

  viewer.entities.add({
    position: calculateCentroid(positions),
    label: {
      text: `面积 ${formatArea(calculatePolygonArea(positions))}`,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: LABEL_BACKGROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function finalizeHeightMeasurement(
  viewer: Cesium.Viewer,
  start: Cesium.Cartesian3,
  end: Cesium.Cartesian3,
) {
  const difference = calculateHeightDifference(start, end)
  const startCartographic = Cesium.Cartographic.fromCartesian(start)
  const endCartographic = Cesium.Cartographic.fromCartesian(end)
  const verticalEnd = Cesium.Cartesian3.fromRadians(
    endCartographic.longitude,
    endCartographic.latitude,
    startCartographic.height,
  )

  viewer.entities.add({
    polyline: {
      positions: [start, end],
      width: 2,
      material: Cesium.Color.WHITE.withAlpha(0.6),
    },
  })

  viewer.entities.add({
    polyline: {
      positions: [verticalEnd, end],
      width: 4,
      material: ACCENT_COLOR,
    },
  })

  viewer.entities.add({
    position: end,
    label: {
      text: `高度差 ${formatDistance(difference)}`,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: LABEL_BACKGROUND,
      pixelOffset: new Cesium.Cartesian2(0, -26),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}
