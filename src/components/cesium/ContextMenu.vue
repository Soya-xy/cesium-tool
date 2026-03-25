<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { ElMenu, ElMenuItem, ElSubMenu, ElIcon } from 'element-plus'
import {
  Location, Camera, Lollipop, MapLocation, View, MagicStick,
  Histogram, Setting, Rank, Minus, Grid, Sort,
  LocationFilled, Share, CopyDocument, EditPen,
  Download, Right, RefreshRight, Sunny, PictureFilled,
  Cloudy, Moon, Star,
} from '@element-plus/icons-vue'
import type { ContextMenuItem } from '@/composables/useContextMenu'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{
  close: []
}>()

const menuRef = ref<HTMLDivElement>()
const adjustedX = ref(0)
const adjustedY = ref(0)

// 图标映射
const iconMap: Record<string, any> = {
  Location, Camera, Lollipop, MapLocation, View, MagicStick,
  Histogram, Setting, Rank, Minus, Grid, Sort,
  LocationFilled, Share, CopyDocument, EditPen,
  Download, Right, RefreshRight, Sunny, PictureFilled,
  Cloudy, Moon, Star,
}

// 调整位置使菜单保持在视口内
watch(() => props.visible, async (val) => {
  if (!val) return
  adjustedX.value = props.x
  adjustedY.value = props.y

  await nextTick()
  if (!menuRef.value) return

  const el = menuRef.value
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (adjustedX.value + rect.width > vw) {
    adjustedX.value = vw - rect.width - 4
  }
  if (adjustedY.value + rect.height > vh) {
    adjustedY.value = vh - rect.height - 4
  }
})

function handleSelect(index: string) {
  // 查找并执行对应的操作
  for (const item of props.items) {
    if (item.index === index && item.action) {
      item.action()
      return
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.index === index && child.action) {
          child.action()
          return
        }
      }
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <!-- 背景层用于捕获外部点击 -->
    <div v-if="visible" class="context-backdrop" @click="emit('close')" @contextmenu.prevent="emit('close')" />

    <div
      v-show="visible"
      ref="menuRef"
      class="context-menu-wrapper"
      :style="{ left: adjustedX + 'px', top: adjustedY + 'px' }"
      @contextmenu.prevent
    >
      <ElMenu
        class="context-el-menu"
        mode="vertical"
        :collapse="false"
        unique-opened
        @select="handleSelect"
      >
        <template v-for="item in items" :key="item.index">
          <!-- 有子项 → 子菜单 -->
          <ElSubMenu v-if="item.children" :index="item.index" popper-class="context-submenu-popper">
            <template #title>
              <ElIcon v-if="iconMap[item.icon]" :size="16"><component :is="iconMap[item.icon]" /></ElIcon>
              <span>{{ item.label }}</span>
            </template>
            <ElMenuItem v-for="child in item.children" :key="child.index" :index="child.index">
              <ElIcon v-if="iconMap[child.icon]" :size="14"><component :is="iconMap[child.icon]" /></ElIcon>
              <span>{{ child.label }}</span>
            </ElMenuItem>
          </ElSubMenu>

          <!-- 无子项 → 菜单项 -->
          <ElMenuItem v-else :index="item.index">
            <ElIcon v-if="iconMap[item.icon]" :size="16"><component :is="iconMap[item.icon]" /></ElIcon>
            <span>{{ item.label }}</span>
          </ElMenuItem>
        </template>
      </ElMenu>
    </div>
  </Teleport>
</template>

<style scoped>
.context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.context-menu-wrapper {
  position: fixed;
  z-index: 9999;
  border-radius: 8px;
  overflow: visible;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.context-el-menu {
  border: none !important;
  border-radius: 8px;
  background: rgba(22, 33, 62, 0.96) !important;
  backdrop-filter: blur(16px);
  padding: 4px 0;
  width: 190px !important;
}

.context-el-menu :deep(.el-menu-item),
.context-el-menu :deep(.el-sub-menu__title) {
  height: 38px;
  line-height: 38px;
  color: #e0e0e0 !important;
  font-size: 13px;
  padding: 0 16px !important;
  background: transparent !important;
  border-radius: 4px;
  margin: 1px 4px;
}

.context-el-menu :deep(.el-menu),
.context-el-menu :deep(.el-menu--inline) {
  background: rgba(22, 33, 62, 0.96) !important;
}

.context-el-menu :deep(.el-sub-menu .el-menu-item) {
  height: 36px;
  line-height: 36px;
  padding-left: 32px !important;
  color: #e0e0e0 !important;
  background: rgba(22, 33, 62, 0.96) !important;
}

.context-el-menu :deep(.el-sub-menu.is-opened > .el-menu) {
  padding: 4px 0;
  margin: 2px 0 4px;
  background: rgba(22, 33, 62, 0.96) !important;
}

.context-el-menu :deep(.el-menu-item:hover),
.context-el-menu :deep(.el-sub-menu__title:hover) {
  background: rgba(14, 165, 233, 0.18) !important;
  color: #38bdf8 !important;
}

.context-el-menu :deep(.el-sub-menu .el-menu-item:hover) {
  background: rgba(14, 165, 233, 0.18) !important;
  color: #38bdf8 !important;
}

.context-el-menu :deep(.el-menu-item.is-active) {
  color: #0ea5e9 !important;
}

.context-el-menu :deep(.el-sub-menu .el-menu-item.is-active) {
  color: #0ea5e9 !important;
  background: rgba(14, 165, 233, 0.12) !important;
}

.context-el-menu :deep(.el-menu-item.is-disabled),
.context-el-menu :deep(.el-sub-menu .el-menu-item.is-disabled) {
  color: rgba(224, 224, 224, 0.45) !important;
  background: rgba(22, 33, 62, 0.96) !important;
}

.context-el-menu :deep(.el-sub-menu__icon-arrow) {
  color: #a0a0b0;
  font-size: 12px;
  right: 12px;
}

.context-el-menu :deep(.el-icon) {
  margin-right: 8px;
  color: inherit;
}

/* 移除左侧边框指示器 */
.context-el-menu :deep(.el-menu-item::before),
.context-el-menu :deep(.el-sub-menu__title::before) {
  display: none;
}
</style>

<!-- 子菜单弹出层的全局样式（不使用 scoped，因为它通过 teleport 挂载到 body） -->
<style>
.context-submenu-popper {
  --el-menu-bg-color: rgba(22, 33, 62, 0.96) !important;
  --el-menu-hover-bg-color: rgba(14, 165, 233, 0.18) !important;
  --el-menu-text-color: #e0e0e0 !important;
  --el-menu-hover-text-color: #38bdf8 !important;
  --el-menu-active-color: #0ea5e9 !important;
  --el-bg-color-overlay: rgba(22, 33, 62, 0.98) !important;
  --el-border-color-light: rgba(42, 42, 74, 0.85) !important;
}

.context-submenu-popper.el-popper,
.context-submenu-popper .el-popper__content,
.context-submenu-popper .el-menu,
.context-submenu-popper .el-menu--popup {
  background: rgba(22, 33, 62, 0.96) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(42, 42, 74, 0.8) !important;
  border-radius: 8px !important;
  padding: 4px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  min-width: 140px;
}

.context-submenu-popper.el-popper {
  padding: 0 !important;
}

.context-submenu-popper .el-menu-item {
  height: 36px !important;
  line-height: 36px !important;
  color: #e0e0e0 !important;
  font-size: 13px;
  padding: 0 16px !important;
  border-radius: 4px;
  margin: 1px 4px;
}

.context-submenu-popper .el-menu-item:hover {
  background: rgba(14, 165, 233, 0.18) !important;
  color: #38bdf8 !important;
}

.context-submenu-popper .el-menu-item.is-active,
.context-submenu-popper .el-sub-menu__title.is-active {
  color: #38bdf8 !important;
}

.context-submenu-popper .el-menu-item.is-disabled {
  color: rgba(224, 224, 224, 0.45) !important;
  background: transparent !important;
}

.context-submenu-popper .el-menu-item .el-icon {
  margin-right: 8px;
  color: inherit;
}

.context-submenu-popper .el-popper__arrow::before {
  background: rgba(22, 33, 62, 0.96) !important;
  border-color: rgba(42, 42, 74, 0.85) !important;
}
</style>
