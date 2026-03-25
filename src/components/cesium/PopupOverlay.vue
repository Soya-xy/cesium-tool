<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElDialog, ElMessage, ElScrollbar } from 'element-plus'
import { useTilesetStore } from '@/stores/tilesetStore'
import { cartesianToCoordinate } from '@/utils/coordinate'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useTilesetStore()
const dialogStyle = ref<Record<string, string>>({
  margin: '0',
  left: '24px',
  top: '24px',
  position: 'fixed',
})

const dialogVisible = computed(() => props.visible && !!store.selectedFeature)

const positionInfo = computed(() => {
  if (!store.pickedPosition) return null
  return cartesianToCoordinate(store.pickedPosition)
})

function copyValue(val: string) {
  navigator.clipboard.writeText(val)
  ElMessage.success('已复制')
}

function updateDialogPosition() {
  const dialogWidth = 380
  const margin = 24
  const maxLeft = Math.max(margin, window.innerWidth - dialogWidth - margin)
  const left = Math.min(Math.max(props.x + 18, margin), maxLeft)
  const top = Math.max(props.y - 16, margin)

  dialogStyle.value = {
    margin: '0',
    left: `${left}px`,
    top: `${top}px`,
    position: 'fixed',
  }
}

watch(
  () => dialogVisible.value,
  (visible, previousVisible) => {
    if (visible && !previousVisible) {
      updateDialogPosition()
    }
  }
)
</script>

<template>
  <ElDialog
    :model-value="dialogVisible"
    class="feature-dialog"
    width="280px"
    :modal="false"
    :show-close="true"
    :close-on-click-modal="false"
    :lock-scroll="false"
    :append-to-body="true"
    :destroy-on-close="false"
    draggable
    overflow
    :style="dialogStyle"
    @close="emit('close')"
  >
    <template #header>
      <div class="dialog-header">
        <span class="dialog-title">构件属性</span>
        <span v-if="store.propsLoading" class="dialog-meta loading">加载中...</span>
        <span v-else class="dialog-meta">{{ store.featureProperties.length }} 项</span>
      </div>
    </template>

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
    <ElScrollbar v-else max-height="320px" class="props-scroll">
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
    </ElScrollbar>
  </ElDialog>
</template>

<style scoped>
.dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dialog-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.dialog-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.dialog-meta.loading {
  color: var(--accent);
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
  padding-right: 4px;
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
  transition: background 0.15s ease, transform 0.15s ease;
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

<style>
.feature-dialog.el-dialog {
  border-radius: 12px;
  overflow: hidden;
  background: rgba(22, 33, 62, 0.96) !important;
  border: 1px solid var(--border);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(16px);
  padding: 0;
}

.feature-dialog .el-dialog__header {
  margin: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(22, 33, 62, 0.96) !important;
}

.feature-dialog .el-dialog__body {
  padding: 10px;
  color: var(--text-primary);
  background: rgba(22, 33, 62, 0.96) !important;
}

.feature-dialog .el-dialog__headerbtn {
  top: 14px;
}

.feature-dialog .el-dialog__close {
  color: var(--text-secondary);
}

.feature-dialog .el-dialog__close:hover {
  color: var(--danger);
}
</style>
