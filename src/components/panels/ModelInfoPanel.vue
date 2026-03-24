<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTilesetStore } from '@/stores/tilesetStore'
import { useCesiumStore } from '@/stores/cesiumStore'
import { getTilesetStats, formatBytes, type TilesetStats } from '@/utils/tilesetHelper'

const tilesetStore = useTilesetStore()
const cesiumStore = useCesiumStore()

const stats = ref<TilesetStats | null>(null)
let interval: ReturnType<typeof setInterval> | null = null

const activeTileset = computed(() =>
  tilesetStore.tilesets.find(t => t.id === tilesetStore.activeTilesetId)
)

function refreshStats() {
  if (!activeTileset.value) {
    stats.value = null
    return
  }
  try {
    stats.value = getTilesetStats(activeTileset.value.tileset)
  } catch {
    stats.value = null
  }
}

onMounted(() => {
  interval = setInterval(refreshStats, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<template>
  <div class="model-info">
    <div v-if="!activeTileset" class="empty">
      <p>请先加载并选择一个模型</p>
    </div>

    <template v-else-if="stats">
      <div class="section">
        <div class="section-title">基础信息</div>
        <div class="info-row" v-for="item in [
          { label: '版本', value: stats.version },
          { label: '几何误差', value: stats.geometricError.toFixed(2) },
          { label: '瓦片总数', value: stats.totalTiles },
          { label: '已加载瓦片', value: stats.loadedTiles },
          { label: '三角形数', value: stats.trianglesLoaded.toLocaleString() },
          { label: '构件数', value: stats.featuresLoaded.toLocaleString() },
        ]" :key="item.label">
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value">{{ item.value }}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">内存占用</div>
        <div class="info-row" v-for="item in [
          { label: '纹理内存', value: formatBytes(stats.textureMemory) },
          { label: '几何内存', value: formatBytes(stats.geometryMemory) },
          { label: '总内存', value: formatBytes(stats.totalMemory) },
        ]" :key="item.label">
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value">{{ item.value }}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">空间信息</div>
        <div class="info-row" v-for="item in [
          { label: '中心经度', value: stats.centerLon.toFixed(6) + '°' },
          { label: '中心纬度', value: stats.centerLat.toFixed(6) + '°' },
          { label: '中心高度', value: stats.centerHeight.toFixed(2) + 'm' },
          { label: '包围球半径', value: stats.boundingRadius.toFixed(2) + 'm' },
        ]" :key="item.label">
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value">{{ item.value }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.model-info {
  font-size: 13px;
}

.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
}

.section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.info-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.info-value {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}
</style>
