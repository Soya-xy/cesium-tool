<script setup lang="ts">
import { ref } from 'vue'
import { useCesiumStore } from '@/stores/cesiumStore'

const cesiumStore = useCesiumStore()

const depthTest = ref(true)
const showAtmosphere = ref(true)
const showSun = ref(true)
const showMoon = ref(true)
const showSkyBox = ref(true)
const enableFxaa = ref(false)
const enableBloom = ref(false)
const enableShadows = ref(false)

function toggleDepthTest() {
  const viewer = cesiumStore.viewer
  if (!viewer) return
  depthTest.value = !depthTest.value
  viewer.scene.globe.depthTestAgainstTerrain = depthTest.value
}

function toggleAtmosphere() {
  const viewer = cesiumStore.viewer
  if (!viewer) return
  showAtmosphere.value = !showAtmosphere.value
  viewer.scene.globe.showGroundAtmosphere = showAtmosphere.value
}

function toggleSun() {
  const viewer = cesiumStore.viewer
  if (!viewer) return
  showSun.value = !showSun.value
  viewer.scene.sun.show = showSun.value
}

function toggleMoon() {
  const viewer = cesiumStore.viewer
  if (!viewer) return
  showMoon.value = !showMoon.value
  viewer.scene.moon.show = showMoon.value
}

function toggleSkyBox() {
  const viewer = cesiumStore.viewer
  if (!viewer) return
  showSkyBox.value = !showSkyBox.value
  viewer.scene.skyBox.show = showSkyBox.value
}

function toggleFxaa() {
  const viewer = cesiumStore.viewer
  if (!viewer) return
  enableFxaa.value = !enableFxaa.value
  viewer.scene.postProcessStages.fxaa.enabled = enableFxaa.value
}

function toggleBloom() {
  const viewer = cesiumStore.viewer
  if (!viewer) return
  enableBloom.value = !enableBloom.value
  viewer.scene.postProcessStages.bloom.enabled = enableBloom.value
}

function toggleShadows() {
  const viewer = cesiumStore.viewer
  if (!viewer) return
  enableShadows.value = !enableShadows.value
  viewer.shadows = enableShadows.value
}
</script>

<template>
  <div class="debug-panel">
    <div class="section">
      <div class="section-title">场景设置</div>
      <div class="toggle-row" v-for="item in [
        { label: '深度检测', value: depthTest, toggle: toggleDepthTest },
        { label: '大气效果', value: showAtmosphere, toggle: toggleAtmosphere },
        { label: '太阳', value: showSun, toggle: toggleSun },
        { label: '月亮', value: showMoon, toggle: toggleMoon },
        { label: '天空盒', value: showSkyBox, toggle: toggleSkyBox },
      ]" :key="item.label">
        <span>{{ item.label }}</span>
        <button :class="['toggle-btn', { on: item.value }]" @click="item.toggle">
          {{ item.value ? 'ON' : 'OFF' }}
        </button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">后处理效果</div>
      <div class="toggle-row" v-for="item in [
        { label: 'FXAA 抗锯齿', value: enableFxaa, toggle: toggleFxaa },
        { label: 'Bloom 泛光', value: enableBloom, toggle: toggleBloom },
        { label: '实时阴影', value: enableShadows, toggle: toggleShadows },
      ]" :key="item.label">
        <span>{{ item.label }}</span>
        <button :class="['toggle-btn', { on: item.value }]" @click="item.toggle">
          {{ item.value ? 'ON' : 'OFF' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debug-panel {
  font-size: 13px;
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

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  color: var(--text-secondary);
}

.toggle-btn {
  padding: 2px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-dark);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 44px;
}

.toggle-btn.on {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.toggle-btn:hover {
  border-color: var(--accent);
}
</style>
