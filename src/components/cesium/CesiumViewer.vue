<script setup lang="ts">
import { onMounted, ref, provide } from 'vue'
import { useCesium } from '@/composables/useCesium'
import { usePicking } from '@/composables/usePicking'
import { useContextMenu } from '@/composables/useContextMenu'
import { useLocalTileset } from '@/composables/useLocalTileset'
import PopupOverlay from './PopupOverlay.vue'
import ContextMenu from './ContextMenu.vue'

const cesium = useCesium()
const picking = usePicking()
const contextMenu = useContextMenu()
const localTileset = useLocalTileset()
const containerRef = ref<HTMLDivElement>()

// 将悬停高亮开关共享给 PropertyEditor
provide('hoverHighlight', picking.hoverHighlight)

onMounted(() => {
  if (!containerRef.value) return
  cesium.initViewer(containerRef.value)
  picking.setupPicking()
  contextMenu.drawingTools.setupDrawingTools()
  contextMenu.setupContextMenu()
})
</script>

<template>
  <div
    ref="containerRef"
    class="cesium-container"
    @dragenter="localTileset.onDragEnter"
    @dragover="localTileset.onDragOver"
    @dragleave="localTileset.onDragLeave"
    @drop="localTileset.onDrop"
  >
    <!-- 拖放区域遮罩层 -->
    <Transition name="fade">
      <div v-if="localTileset.isDragging.value" class="drop-overlay">
        <div class="drop-zone">
          <div class="drop-icon">📂</div>
          <div class="drop-title">拖放 3DTiles 文件夹到此处</div>
          <div class="drop-hint">自动识别 tileset.json 并加载模型</div>
        </div>
      </div>
    </Transition>

    <!-- 加载中遮罩层 -->
    <Transition name="fade">
      <div v-if="localTileset.isProcessing.value" class="loading-overlay">
        <div class="loading-spinner" />
        <div class="loading-text">正在读取文件并加载模型...</div>
      </div>
    </Transition>

    <!-- 属性弹窗 -->
    <PopupOverlay
      :visible="picking.popupVisible.value"
      :x="picking.popupX.value"
      :y="picking.popupY.value"
      @close="picking.clearPicking()"
    />

    <!-- 右键菜单（Element Plus） -->
    <ContextMenu
      :visible="contextMenu.menuVisible.value"
      :x="contextMenu.menuX.value"
      :y="contextMenu.menuY.value"
      :items="contextMenu.getMenuItems()"
      @close="contextMenu.closeMenu()"
    />
  </div>
</template>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 拖放区域 */
.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  background: rgba(14, 165, 233, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 64px;
  border: 3px dashed var(--accent);
  border-radius: 16px;
  background: rgba(22, 33, 62, 0.9);
  backdrop-filter: blur(8px);
}

.drop-icon {
  font-size: 56px;
  animation: bounce 1s infinite;
}

.drop-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
}

.drop-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* 加载中 */
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 500;
  background: rgba(26, 26, 46, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  pointer-events: none;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: var(--text-primary);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
