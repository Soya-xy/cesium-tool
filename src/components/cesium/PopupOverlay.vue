<script setup lang="ts">
import { useTilesetStore } from '@/stores/tilesetStore'
import { cartesianToCoordinate } from '@/utils/coordinate'
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useTilesetStore()

const positionInfo = computed(() => {
  if (!store.pickedPosition) return null
  return cartesianToCoordinate(store.pickedPosition)
})

function copyValue(val: string) {
  navigator.clipboard.writeText(val)
}
</script>

<template>
  <div
    v-if="visible && store.featureProperties.length > 0"
    class="popup-overlay"
    :style="{
      left: x + 15 + 'px',
      top: y - 10 + 'px',
    }"
  >
    <div class="popup-header">
      <span class="popup-title">构件属性</span>
      <button class="popup-close" @click="emit('close')">✕</button>
    </div>

    <!-- Position info -->
    <div v-if="positionInfo" class="popup-section">
      <div class="prop-row">
        <span class="prop-key">经度</span>
        <span class="prop-val">{{ positionInfo.longitude.toFixed(6) }}°</span>
      </div>
      <div class="prop-row">
        <span class="prop-key">纬度</span>
        <span class="prop-val">{{ positionInfo.latitude.toFixed(6) }}°</span>
      </div>
      <div class="prop-row">
        <span class="prop-key">高度</span>
        <span class="prop-val">{{ positionInfo.height.toFixed(2) }}m</span>
      </div>
    </div>

    <div class="popup-divider" />

    <!-- Feature properties -->
    <div class="popup-section props-list">
      <div
        v-for="prop in store.featureProperties"
        :key="prop.key"
        class="prop-row"
        @click="copyValue(prop.value)"
        title="点击复制"
      >
        <span class="prop-key">{{ prop.key }}</span>
        <span class="prop-val">{{ prop.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.popup-overlay {
  position: absolute;
  z-index: 1000;
  background: rgba(22, 33, 62, 0.95);
  border: 1px solid var(--border);
  border-radius: 8px;
  min-width: 260px;
  max-width: 360px;
  max-height: 400px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.popup-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.popup-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}

.popup-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--danger);
}

.popup-section {
  padding: 8px 12px;
}

.popup-divider {
  border-top: 1px solid var(--border);
  margin: 0 12px;
}

.props-list {
  overflow-y: auto;
  max-height: 280px;
}

.prop-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  gap: 12px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.prop-row:hover {
  background: rgba(14, 165, 233, 0.1);
}

.prop-key {
  color: var(--text-secondary);
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prop-val {
  color: var(--text-primary);
  text-align: right;
  word-break: break-all;
}
</style>
