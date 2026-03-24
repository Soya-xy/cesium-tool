import * as Cesium from 'cesium'

export interface TilesetStats {
  version: string
  geometricError: number
  totalTiles: number
  loadedTiles: number
  trianglesLoaded: number
  featuresLoaded: number
  textureMemory: number
  geometryMemory: number
  totalMemory: number
  centerLon: number
  centerLat: number
  centerHeight: number
  boundingRadius: number
}

export function getTilesetStats(tileset: Cesium.Cesium3DTileset): TilesetStats {
  const center = tileset.boundingSphere.center
  const carto = Cesium.Cartographic.fromCartesian(center)

  return {
    version: (tileset.asset as any)?.version ?? 'unknown',
    geometricError: tileset.root?.geometricError ?? tileset.geometricError,
    totalTiles: countTiles(tileset.root),
    loadedTiles: tileset.statistics?.numberOfLoadedTilesTotal ?? 0,
    trianglesLoaded: tileset.statistics?.numberOfTrianglesLoaded ?? 0,
    featuresLoaded: tileset.statistics?.numberOfFeaturesLoaded ?? 0,
    textureMemory: tileset.statistics?.texturesByteLength ?? 0,
    geometryMemory: tileset.statistics?.geometryByteLength ?? 0,
    totalMemory: (tileset.statistics?.texturesByteLength ?? 0) + (tileset.statistics?.geometryByteLength ?? 0),
    centerLon: Cesium.Math.toDegrees(carto.longitude),
    centerLat: Cesium.Math.toDegrees(carto.latitude),
    centerHeight: carto.height,
    boundingRadius: tileset.boundingSphere.radius,
  }
}

function countTiles(tile: Cesium.Cesium3DTile | undefined): number {
  if (!tile) return 0
  let count = 1
  if (tile.children) {
    for (const child of tile.children) {
      count += countTiles(child)
    }
  }
  return count
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}
