<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTilesetStore } from '@/stores/tilesetStore'
import { useTileset } from '@/composables/useTileset'

const store = useTilesetStore()
const { updateTilesetProperty } = useTileset()

const activeTileset = computed(() =>
  store.tilesets.find(t => t.id === store.activeTilesetId)
)

// Editable properties
const maxSSE = ref(16)
const maxMemory = ref(512)
const showBoundingVolume = ref(false)
const showContentBV = ref(false)
const debugColorizeTiles = ref(false)
const debugFreezeFrame = ref(false)
const debugWireframe = ref(false)
const backFaceCulling = ref(true)
const opacity = ref(1)

watch(activeTileset, (ts) => {
  if (!ts) return
  const t = ts.tileset as any
  maxSSE.value = t.maximumScreenSpaceError ?? 16
  maxMemory.value = t.maximumMemoryUsage ?? 512
  showBoundingVolume.value = t.debugShowBoundingVolume ?? false
  showContentBV.value = t.debugShowContentBoundingVolume ?? false
  debugColorizeTiles.value = t.debugColorizeTiles ?? false
  debugFreezeFrame.value = t.debugFreezeFrame ?? false
  debugWireframe.value = t.debugWireframe ?? false
  backFaceCulling.value = t.backFaceCulling ?? true
}, { immediate: true })

function update(prop: string, value: any) {
  if (!store.activeTilesetId) return
  updateTilesetProperty(store.activeTilesetId, prop, value)
}
</script>

<template>
  <div class="property-editor">
    <div v-if="!activeTileset" class="empty">
      <p>请先加载并选择一个模型</p>
    </div>

    <template v-else>
      <div class="section">
        <div class="section-title">渲染属性</div>

        <div class="prop-row">
          <label>最大屏幕空间误差</label>
          <div class="prop-control">
            <input
              type="range"
              :value="maxSSE"
              min="1"
              max="128"
              step="1"
              @input="maxSSE = +($event.target as HTMLInputElement).value; update('maximumScreenSpaceError', maxSSE)"
            />
            <span class="prop-value">{{ maxSSE }}</span>
          </div>
        </div>

        <div class="prop-row">
          <label>最大内存 (MB)</label>
          <div class="prop-control">
            <input
              type="range"
              :value="maxMemory"
              min="64"
              max="2048"
              step="64"
              @input="maxMemory = +($event.target as HTMLInputElement).value; update('maximumMemoryUsage', maxMemory)"
            />
            <span class="prop-value">{{ maxMemory }}</span>
          </div>
        </div>

        <div class="prop-row">
          <label>透明度</label>
          <div class="prop-control">
            <input
              type="range"
              :value="opacity"
              min="0"
              max="1"
              step="0.05"
              @input="opacity = +($event.target as HTMLInputElement).value"
            />
            <span class="prop-value">{{ opacity.toFixed(2) }}</span>
          </div>
        </div>

        <div class="prop-row inline">
          <label>背面剔除</label>
          <input
            type="checkbox"
            :checked="backFaceCulling"
            @change="backFaceCulling = ($event.target as HTMLInputElement).checked; update('backFaceCulling', backFaceCulling)"
          />
        </div>
      </div>

      <div class="section">
        <div class="section-title">调试选项</div>

        <div class="prop-row inline">
          <label>显示包围盒</label>
          <input
            type="checkbox"
            :checked="showBoundingVolume"
            @change="showBoundingVolume = ($event.target as HTMLInputElement).checked; update('debugShowBoundingVolume', showBoundingVolume)"
          />
        </div>

        <div class="prop-row inline">
          <label>显示内容包围盒</label>
          <input
            type="checkbox"
            :checked="showContentBV"
            @change="showContentBV = ($event.target as HTMLInputElement).checked; update('debugShowContentBoundingVolume', showContentBV)"
          />
        </div>

        <div class="prop-row inline">
          <label>随机着色瓦片</label>
          <input
            type="checkbox"
            :checked="debugColorizeTiles"
            @change="debugColorizeTiles = ($event.target as HTMLInputElement).checked; update('debugColorizeTiles', debugColorizeTiles)"
          />
        </div>

        <div class="prop-row inline">
          <label>冻结帧</label>
          <input
            type="checkbox"
            :checked="debugFreezeFrame"
            @change="debugFreezeFrame = ($event.target as HTMLInputElement).checked; update('debugFreezeFrame', debugFreezeFrame)"
          />
        </div>

        <div class="prop-row inline">
          <label>线框模式</label>
          <input
            type="checkbox"
            :checked="debugWireframe"
            @change="debugWireframe = ($event.target as HTMLInputElement).checked; update('debugWireframe', debugWireframe)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.property-editor {
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

.prop-row {
  margin-bottom: 10px;
}

.prop-row label {
  display: block;
  color: var(--text-secondary);
  font-size: 12px;
  margin-bottom: 4px;
}

.prop-row.inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.prop-row.inline label {
  margin-bottom: 0;
}

.prop-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prop-control input[type="range"] {
  flex: 1;
  height: 4px;
  accent-color: var(--accent);
}

.prop-value {
  min-width: 40px;
  text-align: right;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}

input[type="checkbox"] {
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
}
</style>
