<script setup lang="ts">
import { useTilesetStore } from '@/stores/tilesetStore'
import { useTileset } from '@/composables/useTileset'

const store = useTilesetStore()
const { removeTileset, toggleVisibility, flyToTileset } = useTileset()
</script>

<template>
  <div class="model-list">
    <div class="panel-header">
      <span>模型列表</span>
      <span class="model-count">{{ store.tilesets.length }}</span>
    </div>

    <div v-if="store.tilesets.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <p>暂无模型</p>
      <p class="empty-hint">在顶部输入框中输入 tileset.json URL 加载模型</p>
    </div>

    <div v-else class="model-items">
      <div
        v-for="item in store.tilesets"
        :key="item.id"
        :class="['model-item', { active: store.activeTilesetId === item.id }]"
        @click="store.activeTilesetId = item.id"
      >
        <div class="model-info">
          <span class="model-name">{{ item.name }}</span>
          <span class="model-url" :title="item.url">{{ item.url }}</span>
        </div>
        <div class="model-actions">
          <button
            class="action-btn"
            :title="item.visible ? '隐藏' : '显示'"
            @click.stop="toggleVisibility(item.id)"
          >
            {{ item.visible ? '👁' : '👁‍🗨' }}
          </button>
          <button
            class="action-btn"
            title="定位"
            @click.stop="flyToTileset(item.id)"
          >
            📍
          </button>
          <button
            class="action-btn danger"
            title="删除"
            @click.stop="removeTileset(item.id)"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}

.model-count {
  background: var(--accent);
  color: white;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.6;
}

.model-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.model-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.model-item:hover {
  background: rgba(14, 165, 233, 0.08);
}

.model-item.active {
  background: rgba(14, 165, 233, 0.12);
  border-color: var(--accent);
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.model-url {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.action-btn:hover {
  background: rgba(14, 165, 233, 0.15);
  border-color: var(--accent);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: var(--danger);
}
</style>
