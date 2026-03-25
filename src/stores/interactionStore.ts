import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type DrawingMode =
  | 'measure-space'
  | 'measure-horizontal'
  | 'measure-area'
  | 'measure-height'
  | 'mark-point'
  | 'mark-line'
  | 'mark-polygon'
  | 'mark-text'

export const useInteractionStore = defineStore('interaction', () => {
  const activeMode = ref<DrawingMode | null>(null)
  const suppressContextMenu = ref(false)

  const isDrawing = computed(() => activeMode.value !== null)

  function startDrawing(mode: DrawingMode) {
    activeMode.value = mode
  }

  function stopDrawing() {
    activeMode.value = null
  }

  function blockContextMenuOnce() {
    suppressContextMenu.value = true
  }

  function consumeContextMenuBlock() {
    const blocked = suppressContextMenu.value
    suppressContextMenu.value = false
    return blocked
  }

  return {
    activeMode,
    isDrawing,
    suppressContextMenu,
    startDrawing,
    stopDrawing,
    blockContextMenuOnce,
    consumeContextMenuBlock,
  }
})
