import * as Cesium from 'cesium'

export interface CoordinateInfo {
  longitude: number
  latitude: number
  height: number
  cartesian: Cesium.Cartesian3
}

export function cartesianToCoordinate(cartesian: Cesium.Cartesian3): CoordinateInfo {
  const carto = Cesium.Cartographic.fromCartesian(cartesian)
  return {
    longitude: Cesium.Math.toDegrees(carto.longitude),
    latitude: Cesium.Math.toDegrees(carto.latitude),
    height: carto.height,
    cartesian,
  }
}

export function formatDegree(deg: number, isLat: boolean): string {
  const abs = Math.abs(deg)
  const d = Math.floor(abs)
  const mf = (abs - d) * 60
  const m = Math.floor(mf)
  const s = ((mf - m) * 60).toFixed(2)
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W')
  return `${d}°${m}'${s}"${dir}`
}

export function formatCoordinate(lon: number, lat: number, height: number): string {
  return `${lon.toFixed(6)}°, ${lat.toFixed(6)}°, ${height.toFixed(2)}m`
}
