<script setup lang="ts">
import { ref, computed, onMounted, inject, type Ref } from 'vue'
import { useBimFloor, type FloorInfo } from '@/composables/useBimFloor'
import { useTilesetStore } from '@/stores/tilesetStore'

const tilesetStore = useTilesetStore()
const bimFloor = useBimFloor()

// 当前激活的 tileset
const activeTileset = computed(() =>
  tilesetStore.tilesets.find(t => t.id === tilesetStore.activeTilesetId)
)

// 是否有楼层数据
const hasFloors = computed(() => bimFloor.floors.value.length > 0)
const initialized = ref(false)

/** 初始化楼层信息 */
async function init() {
  if (!activeTileset.value || initialized.value) return
  initialized.value = true
  await bimFloor.initFloors(activeTileset.value.url)
}

/** 进入分层模式 */
async function enterMode() {
  if (!activeTileset.value) return
  await bimFloor.enterFloorMode(activeTileset.value.tileset)
}

/** 退出分层模式 */
function exitMode() {
  if (!activeTileset.value) return
  bimFloor.exitFloorMode(activeTileset.value.tileset)
}

// 当激活模型变化时，自动初始化
onMounted(() => {
  // 延迟初始化，等 tileset 加载完
  const check = setInterval(() => {
    if (activeTileset.value) {
      clearInterval(check)
      init()
    }
  }, 500)
  // 30秒后停止检查
  setTimeout(() => clearInterval(check), 30000)
})
</script>

<template>
  <div class="bim-floor-panel">
    <div class="panel-header">
      <span>BIM 分层</span>
      <span v-if="bimFloor.loading.value" class="loading-badge">加载中...</span>
    </div>

    <!-- 未加载模型 -->
    <div v-if="!activeTileset" class="empty">
      <p>请先加载模型</p>
    </div>

    <!-- 无楼层数据 -->
    <div v-else-if="initialized && !hasFloors" class="empty">
      <p>该模型无分层数据</p>
      <p class="hint">需要 F1/F2/... 子目录包含 tileset.json</p>
    </div>

    <!-- 有楼层数据 -->
    <template v-else-if="hasFloors">
      <!-- 模式切换 -->
      <div class="mode-switch">
        <button
          v-if="!bimFloor.floorMode.value"
          class="mode-btn enter"
          :disabled="bimFloor.loading.value"
          @click="enterMode"
        >
          🏗 进入分层模式
        </button>
        <template v-else>
          <button class="mode-btn exit" @click="exitMode">
            ↩ 退出分层
          </button>
          <button class="mode-btn show-all" @click="bimFloor.showAllFloors()">
            👁 全部显示
          </button>
        </template>
      </div>

      <!-- 楼层列表 -->
      <div v-if="bimFloor.floorMode.value" class="floor-list">
        <div
          v-for="floor in bimFloor.floors.value"
          :key="floor.index"
          :class="['floor-item', { hidden: !floor.visible }]"
        >
          <div class="floor-header">
            <button
              class="floor-vis-btn"
              :title="floor.visible ? '隐藏' : '显示'"
              @click="bimFloor.toggleFloor(floor)"
            >
              {{ floor.visible ? '👁' : '👁‍🗨' }}
            </button>
            <span class="floor-label">{{ floor.label }}</span>
            <div class="floor-actions">
              <button class="floor-action" title="仅显示此层" @click="bimFloor.isolateFloor(floor)">
                🎯
              </button>
              <button class="floor-action" title="飞到此层" @click="bimFloor.flyToFloor(floor)">
                📍
              </button>
            </div>
          </div>
          <div v-if="floor.loaded" class="floor-info">
            <div class="info-row">
              <span class="info-label">中心高度</span>
              <span class="info-value">{{ floor.heightCenter.toFixed(1) }}m</span>
            </div>
            <div class="info-row">
              <span class="info-label">底部</span>
              <span class="info-value">{{ floor.heightBottom.toFixed(1) }}m</span>
            </div>
            <div class="info-row">
              <span class="info-label">顶部</span>
              <span class="info-value">{{ floor.heightTop.toFixed(1) }}m</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 建筑列表 -->
      <div v-if="bimFloor.buildings.value.length > 0" class="building-section">
        <div class="section-title">建筑列表 ({{ bimFloor.buildings.value.length }})</div>
        <div
          v-for="b in bimFloor.buildings.value"
          :key="b.id"
          class="building-item"
        >
          <span class="building-name">{{ b.name }}</span>
          <span class="building-floors">{{ b.floorH }}层</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bim-floor-panel {
  font-size: 13px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}

.loading-badge {
  font-size: 11px;
  color: var(--accent);
  font-weight: 400;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px 0;
}

.hint {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.6;
}

.mode-switch {
  display: flex;
  gap: 6px;
  padding: 10px 0;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  background: var(--bg-dark);
  color: var(--text-primary);
}

.mode-btn.enter {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.mode-btn.enter:hover {
  background: var(--accent-hover);
}

.mode-btn.exit {
  background: rgba(239, 68, 68, 0.15);
  border-color: var(--danger);
  color: var(--danger);
}

.mode-btn.show-all:hover,
.mode-btn.exit:hover {
  background: rgba(255, 255, 255, 0.08);
}

.mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.floor-list {
  padding: 4px 0;
}

.floor-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
  transition: opacity 0.2s;
}

.floor-item.hidden {
  opacity: 0.4;
}

.floor-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  gap: 8px;
}

.floor-vis-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.floor-label {
  font-weight: 600;
  color: var(--accent);
  flex: 1;
}

.floor-actions {
  display: flex;
  gap: 4px;
}

.floor-action {
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  transition: all 0.15s;
}

.floor-action:hover {
  background: rgba(14, 165, 233, 0.15);
  border-color: var(--accent);
}

.floor-info {
  padding: 4px 10px 8px;
  display: flex;
  gap: 12px;
}

.info-row {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info-label {
  font-size: 10px;
  color: var(--text-secondary);
}

.info-value {
  font-size: 12px;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.building-section {
  padding-top: 12px;
  border-top: 1px solid var(--border);
  margin-top: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 8px;
}

.building-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}

.building-name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.building-floors {
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
