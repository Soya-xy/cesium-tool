<script setup lang="ts">
import { inject, ref, onMounted, onUnmounted } from 'vue'
import { useCesiumStore } from '@/stores/cesiumStore'
import * as Cesium from 'cesium'

const cesiumStore = useCesiumStore()

const mouseLon = ref(0)
const mouseLat = ref(0)
const mouseHeight = ref(0)
const cameraHeight = ref(0)
const fps = ref(0)
const tileCount = ref(0)

let removePostRender: (() => void) | null = null
let removeMouseMove: Cesium.ScreenSpaceEventHandler | null = null
let fpsInterval: ReturnType<typeof setInterval> | null = null
let frameCount = 0

onMounted(() => {
  // Poll until viewer is available
  const check = setInterval(() => {
    const viewer = cesiumStore.viewer
    if (!viewer) return
    clearInterval(check)

    // Mouse tracking
    removeMouseMove = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    removeMouseMove.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const ray = viewer.camera.getPickRay(movement.endPosition)
      if (!ray) return
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        ?? viewer.scene.pickPosition(movement.endPosition)
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        mouseLon.value = Cesium.Math.toDegrees(carto.longitude)
        mouseLat.value = Cesium.Math.toDegrees(carto.latitude)
        mouseHeight.value = carto.height
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // Camera height
    viewer.camera.changed.addEventListener(() => {
      const carto = Cesium.Cartographic.fromCartesian(viewer.camera.positionWC)
      cameraHeight.value = carto.height
    })
    // Init camera height
    const carto = Cesium.Cartographic.fromCartesian(viewer.camera.positionWC)
    cameraHeight.value = carto.height

    // FPS
    viewer.scene.postRender.addEventListener(() => { frameCount++ })
    fpsInterval = setInterval(() => {
      fps.value = frameCount
      frameCount = 0
    }, 1000)
  }, 200)
})

onUnmounted(() => {
  removeMouseMove?.destroy()
  if (fpsInterval) clearInterval(fpsInterval)
})

function formatHeight(h: number): string {
  if (h > 10000) return (h / 1000).toFixed(1) + ' km'
  return h.toFixed(1) + ' m'
}
</script>

<template>
  <div class="statusbar">
    <div class="status-item">
      <span class="status-label">经度</span>
      <span class="status-value">{{ mouseLon.toFixed(6) }}°</span>
    </div>
    <div class="status-sep" />
    <div class="status-item">
      <span class="status-label">纬度</span>
      <span class="status-value">{{ mouseLat.toFixed(6) }}°</span>
    </div>
    <div class="status-sep" />
    <div class="status-item">
      <span class="status-label">海拔</span>
      <span class="status-value">{{ mouseHeight.toFixed(1) }}m</span>
    </div>
    <div class="status-sep" />
    <div class="status-item">
      <span class="status-label">相机高度</span>
      <span class="status-value">{{ formatHeight(cameraHeight) }}</span>
    </div>
    <div class="status-spacer" />
    <div class="status-item">
      <span class="status-label">FPS</span>
      <span :class="['status-value', fps < 30 ? 'fps-low' : 'fps-ok']">{{ fps }}</span>
    </div>
  </div>
</template>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  font-size: 12px;
  gap: 4px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-label {
  color: var(--text-secondary);
}

.status-value {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.status-sep {
  width: 1px;
  height: 14px;
  background: var(--border);
  margin: 0 8px;
}

.status-spacer {
  flex: 1;
}

.fps-ok {
  color: var(--success);
}

.fps-low {
  color: var(--danger);
}
</style>
