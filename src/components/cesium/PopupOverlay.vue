<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useTilesetStore } from '@/stores/tilesetStore'
import { cartesianToCoordinate } from '@/utils/coordinate'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{ close: [] }>()
const store = useTilesetStore()

// 弹窗位置
const left = ref(24)
const top = ref(24)

// 拖拽状态
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartLeft = 0
let dragStartTop = 0

const showPopup = computed(() => props.visible && !!store.selectedFeature)

const positionInfo = computed(() => {
  if (!store.pickedPosition) return null
  return cartesianToCoordinate(store.pickedPosition)
})

function copyValue(val: string) {
  navigator.clipboard.writeText(val)
  ElMessage.success('已复制')
}

function updatePosition() {
  const w = 280
  const margin = 24
  const maxLeft = Math.max(margin, window.innerWidth - w - margin)
  left.value = Math.min(Math.max(props.x + 18, margin), maxLeft)
  top.value = Math.max(props.y - 16, margin)
}

// 拖拽
function onHeaderMousedown(e: MouseEvent) {
  isDragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartLeft = left.value
  dragStartTop = top.value
  document.addEventListener('mousemove', onDocMousemove)
  document.addEventListener('mouseup', onDocMouseup)
}

function onDocMousemove(e: MouseEvent) {
  if (!isDragging) return
  left.value = dragStartLeft + (e.clientX - dragStartX)
  top.value = dragStartTop + (e.clientY - dragStartY)
}

function onDocMouseup() {
  isDragging = false
  document.removeEventListener('mousemove', onDocMousemove)
  document.removeEventListener('mouseup', onDocMouseup)
}

watch(() => showPopup.value, (v, prev) => {
  if (v && !prev) updatePosition()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDocMousemove)
  document.removeEventListener('mouseup', onDocMouseup)
})
</script>

<template>
  <div
    v-show="showPopup"
    class="feature-popup"
    :style="{ left: left + 'px', top: top + 'px' }"
  >
    <!-- 标题栏（可拖拽） -->
    <div class="popup-header" @mousedown.prevent="onHeaderMousedown">
      <span class="popup-title">构件属性</span>
      <span v-if="store.propsLoading" class="popup-meta loading">加载中...</span>
      <span v-else class="popup-meta">{{ store.featureProperties.length }} 项</span>
      <button class="popup-close" @click="emit('close')">×</button>
    </div>

    <!-- 内容区 -->
    <div class="popup-body">
      <div v-if="positionInfo" class="section">
        <div
          class="prop-row clickable"
          @click="copyValue(`${positionInfo.longitude.toFixed(6)}, ${positionInfo.latitude.toFixed(6)}, ${positionInfo.height.toFixed(2)}`)"
        >
          <span class="prop-key">坐标</span>
          <span class="prop-val">{{ positionInfo.longitude.toFixed(6) }}°, {{ positionInfo.latitude.toFixed(6) }}°</span>
        </div>
        <div class="prop-row">
          <span class="prop-key">高度</span>
          <span class="prop-val">{{ positionInfo.height.toFixed(2) }}m</span>
        </div>
        <div v-if="store.featureFloorLabel" class="prop-row highlight-row">
          <span class="prop-key">所属楼层</span>
          <span class="prop-val accent">{{ store.featureFloorLabel }}</span>
        </div>
        <div v-if="store.featureGroundHeight != null" class="prop-row highlight-row">
          <span class="prop-key">离地高度</span>
          <span class="prop-val accent">{{ store.featureGroundHeight.toFixed(2) }}m</span>
        </div>
      </div>

      <div class="divider" />

      <div v-if="store.propsLoading" class="loading-state">
        <span>正在读取属性...</span>
      </div>
      <div v-else class="props-scroll">
        <div class="props-list">
          <div
            v-for="prop in store.featureProperties"
            :key="prop.key"
            class="prop-row clickable"
            title="点击复制"
            @click="copyValue(prop.value)"
          >
            <span class="prop-key">{{ prop.key }}</span>
            <span class="prop-val">{{ prop.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-popup {
  position: fixed;
  z-index: 999;
  width: 280px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(22, 33, 62, 0.96);
  border: 1px solid var(--border);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(16px);
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  cursor: grab;
  user-select: none;
}

.popup-header:active {
  cursor: grabbing;
}

.popup-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.popup-meta {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
}

.popup-meta.loading {
  color: var(--accent);
}

.popup-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  line-height: 1;
}

.popup-close:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

.popup-body {
  padding: 10px;
  color: var(--text-primary);
}

.section,
.props-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 12px 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.props-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.props-scroll::-webkit-scrollbar {
  width: 4px;
}

.props-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.prop-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.prop-row.clickable {
  cursor: pointer;
  transition: background 0.15s ease;
}

.prop-row.clickable:hover {
  background: rgba(14, 165, 233, 0.12);
}

.prop-key {
  color: var(--text-secondary);
  flex: 0 0 110px;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.prop-val {
  color: var(--text-primary);
  text-align: right;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.45;
}

.prop-val.accent {
  color: var(--accent);
  font-weight: 600;
}

.highlight-row {
  background: rgba(14, 165, 233, 0.08);
}
</style>
