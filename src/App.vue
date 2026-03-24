<script setup lang="ts">
import { ref, provide } from 'vue'
import CesiumViewer from './components/cesium/CesiumViewer.vue'
import TopToolbar from './components/toolbar/TopToolbar.vue'
import StatusBar from './components/statusbar/StatusBar.vue'
import ModelList from './components/panels/ModelList.vue'
import PropertyEditor from './components/panels/PropertyEditor.vue'
import DebugPanel from './components/panels/DebugPanel.vue'
import ModelInfoPanel from './components/panels/ModelInfoPanel.vue'

const leftPanelVisible = ref(true)
const rightPanelVisible = ref(true)
const rightTab = ref('property')

provide('leftPanelVisible', leftPanelVisible)
provide('rightPanelVisible', rightPanelVisible)
</script>

<template>
  <div class="app dark">
    <TopToolbar class="toolbar" />
    <div class="main">
      <!-- Left Panel -->
      <transition name="slide-left">
        <div v-show="leftPanelVisible" class="panel left-panel">
          <ModelList />
        </div>
      </transition>

      <!-- Toggle left panel -->
      <button class="panel-toggle left-toggle" @click="leftPanelVisible = !leftPanelVisible">
        {{ leftPanelVisible ? '◀' : '▶' }}
      </button>

      <!-- Cesium Scene -->
      <div class="scene-container">
        <CesiumViewer />
      </div>

      <!-- Toggle right panel -->
      <button class="panel-toggle right-toggle" @click="rightPanelVisible = !rightPanelVisible">
        {{ rightPanelVisible ? '▶' : '◀' }}
      </button>

      <!-- Right Panel -->
      <transition name="slide-right">
        <div v-show="rightPanelVisible" class="panel right-panel">
          <div class="panel-tabs">
            <button
              v-for="tab in [
                { key: 'property', label: '属性' },
                { key: 'debug', label: '调试' },
                { key: 'info', label: '信息' },
              ]"
              :key="tab.key"
              :class="['tab-btn', { active: rightTab === tab.key }]"
              @click="rightTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="panel-content">
            <PropertyEditor v-show="rightTab === 'property'" />
            <DebugPanel v-show="rightTab === 'debug'" />
            <ModelInfoPanel v-show="rightTab === 'info'" />
          </div>
        </div>
      </transition>
    </div>
    <StatusBar class="statusbar" />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
  color: var(--text-primary);
}

.toolbar {
  height: var(--toolbar-height);
  flex-shrink: 0;
}

.main {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.panel {
  width: var(--panel-width);
  flex-shrink: 0;
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  z-index: 10;
}

.right-panel {
  border-right: none;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.scene-container {
  flex: 1;
  position: relative;
  min-width: 0;
}

.panel-toggle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 20px;
  height: 60px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: background 0.2s;
}

.panel-toggle:hover {
  background: var(--bg-card);
  color: var(--accent);
}

.left-toggle {
  left: v-bind("leftPanelVisible ? 'var(--panel-width)' : '0'");
  border-radius: 0 4px 4px 0;
  border-left: none;
  transition: left 0.3s;
}

.right-toggle {
  right: v-bind("rightPanelVisible ? 'var(--panel-width)' : '0'");
  border-radius: 4px 0 0 4px;
  border-right: none;
  transition: right 0.3s;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.statusbar {
  height: var(--statusbar-height);
  flex-shrink: 0;
}

/* Transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
