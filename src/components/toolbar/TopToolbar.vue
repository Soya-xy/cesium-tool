<script setup lang="ts">
import { ref } from 'vue'
import { useTileset } from '@/composables/useTileset'
import { ElMessage } from 'element-plus'

const { loadTileset } = useTileset()
const modelUrl = ref('/map/tileset.json')
const loading = ref(false)

async function handleLoad() {
  const url = modelUrl.value.trim()
  if (!url) {
    ElMessage.warning('请输入模型 URL')
    return
  }
  loading.value = true
  try {
    await loadTileset(url)
    ElMessage.success('模型加载成功')
  } catch {
    ElMessage.error('模型加载失败，请检查 URL')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-brand">
      <span class="brand-icon">🌍</span>
      <span class="brand-text">GASON Cesium Devtools</span>
    </div>
    <div class="toolbar-input">
      <input
        v-model="modelUrl"
        class="url-input"
        placeholder="输入 3DTiles tileset.json URL..."
        @keyup.enter="handleLoad"
      />
      <button class="load-btn" :disabled="loading" @click="handleLoad">
        {{ loading ? '加载中...' : '加载模型' }}
      </button>
    </div>
    <div class="toolbar-actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  gap: 16px;
}

.toolbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.brand-icon {
  font-size: 20px;
}

.brand-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
}

.toolbar-input {
  flex: 1;
  display: flex;
  gap: 8px;
  max-width: 700px;
}

.url-input {
  flex: 1;
  height: 32px;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0 12px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.url-input:focus {
  border-color: var(--accent);
}

.url-input::placeholder {
  color: var(--text-secondary);
}

.load-btn {
  height: 32px;
  padding: 0 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.2s;
}

.load-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.load-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
</style>
