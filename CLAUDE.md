# Cesium 3D Tiles 调试平台

## 项目概述

基于 Vue 3 + Cesium + Vite 8 的 3D Tiles 模型调试平台，支持模型加载、构件拾取高亮、右键菜单、BIM 分层、属性查看等功能。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | ^3.5 |
| 构建 | Vite 8 (Rolldown) | ^8.0 |
| 3D引擎 | CesiumJS | ^1.139 |
| UI | Element Plus | ^2.13 |
| 状态管理 | Pinia | ^3.0 |
| 语言 | TypeScript | ~6.0 |
| 底图 | 天地图卫星影像 (WMTS) | - |

## 天地图配置

- **Key**: `789e558be762ff832392a0393fd8a4f1`
- 配置文件: `src/config/tianditu.ts`

## 架构说明

### 目录结构

```
src/
├── main.ts                     # 入口：挂载 Vue、Pinia、Element Plus
├── App.vue                     # 根布局：工具栏 + 左面板 + 场景 + 右面板 + 状态栏
├── config/
│   └── tianditu.ts             # 天地图 Key 和 WMTS 图层 URL
├── components/
│   ├── cesium/
│   │   ├── CesiumViewer.vue    # 核心：Cesium 场景容器 + 拖放 + 右键菜单 + 弹窗
│   │   ├── ContextMenu.vue     # 右键菜单（Element Plus el-menu 实现）
│   │   └── PopupOverlay.vue    # 构件属性弹窗（v-show 避免重复挂载）
│   ├── panels/
│   │   ├── ModelList.vue       # 左侧：模型列表管理
│   │   ├── PropertyEditor.vue  # 右侧-属性：渲染/调试属性 + 悬停高亮开关
│   │   ├── DebugPanel.vue      # 右侧-调试：场景设置 + 后处理开关
│   │   └── ModelInfoPanel.vue  # 右侧-信息：模型统计（实时刷新）
│   ├── toolbar/
│   │   └── TopToolbar.vue      # 顶部：URL 输入 + 加载按钮
│   └── statusbar/
│       └── StatusBar.vue       # 底部：鼠标坐标 + 相机高度 + FPS
├── composables/
│   ├── useCesium.ts            # Viewer 初始化、天地图底图、鼠标/相机追踪
│   ├── useTileset.ts           # 3DTiles 加载/删除/属性修改
│   ├── usePicking.ts           # 构件拾取、高亮、弹窗定位（性能优化）
│   ├── useContextMenu.ts       # 右键菜单数据和事件处理
│   └── useLocalTileset.ts      # 本地文件夹拖放加载（fetch + XHR 拦截）
├── stores/
│   ├── cesiumStore.ts          # Viewer 实例全局引用 (shallowRef)
│   └── tilesetStore.ts         # 模型列表 + 选中构件 + 属性数据
├── utils/
│   ├── coordinate.ts           # 坐标转换（笛卡尔 → 经纬度 → 度分秒）
│   └── tilesetHelper.ts        # Tileset 统计信息提取 + 字节格式化
└── styles/
    └── global.css              # 全局样式 + CSS 变量 + Cesium UI 覆盖
```

### 核心架构模式

**Composable 分离关注点：** 每个 composable 负责一个独立功能域，通过 Pinia store 共享状态。

```
CesiumViewer.vue
  ├── useCesium()         → 初始化 Viewer、底图、事件追踪
  ├── usePicking()        → 构件拾取、高亮、弹窗
  ├── useContextMenu()    → 右键菜单
  └── useLocalTileset()   → 本地文件拖放
```

**状态流向：**
```
用户操作 → composable → Pinia store → Vue 组件响应式更新
                                    ↘ Cesium API 调用
```

### 性能关键设计

1. **`scene.pick()` 不可避免** — 大型 BIM 模型（305MB 纹理 + 63MB 几何体）的 GPU 拾取渲染是同步的
2. **`feature.color` 设置延迟到 `setTimeout`** — 修改颜色触发 Cesium 内部 batch texture 重建，非常昂贵
3. **属性读取异步化** — `getPropertyIds()` + `getProperty()` 放到 `setTimeout(16)` 避免阻塞 UI
4. **弹窗用 `v-show` 不用 `v-if`** — 避免 100+ 属性行的 DOM 反复创建/销毁
5. **`featureProperties` 使用 `shallowRef`** — 整体替换触发一次更新，而非逐项响应
6. **关闭弹窗不清空属性数组** — 隐藏即可，避免触发 Vue VDOM diff
7. **鼠标追踪用 `globe.pick()` 而非 `pickPosition()`** — 快几十倍（射线求交 vs 深度缓冲读取）

### Cesium 集成方式

- **不使用 `vite-plugin-cesium`**（与 Vite 8 不兼容）
- `vite.config.ts` 内置自定义插件 `cesiumPlugin()`：
  - 开发模式：中间件代理 `node_modules/cesium/Build/Cesium/` 静态资源
  - 定义 `CESIUM_BASE_URL = '/cesium/'`
- 路径别名使用 Vite 8 内置 `resolve.tsconfigPaths: true`

### 本地文件夹拖放

- 通过 `webkitGetAsEntry()` 递归读取目录树
- 文件存入内存 `Map<string, File>`
- 拦截 `Cesium.Resource._Implementations.loadWithXhr`（Cesium 内部 XHR 加载器）
- 同时拦截 `window.fetch` 作为兜底
- 虚拟 URL 前缀: `/__local_tiles__/`

## 编码规范

- **语言**: TypeScript strict 模式
- **组件**: Vue 3 `<script setup lang="ts">` + Composition API
- **注释**: 中文注释
- **状态管理**: Pinia setup store（`defineStore` + 组合式 API）
- **样式**: Scoped CSS + CSS 变量（`--bg-dark`, `--accent` 等）
- **命名**:
  - 组件: PascalCase (`CesiumViewer.vue`)
  - composable: camelCase (`useCesium.ts`)
  - store: camelCase (`cesiumStore.ts`)
  - 工具函数: camelCase (`coordinate.ts`)

## 已知问题

- **Chrome 扩展影响性能**: Vue DevTools 等扩展会序列化 Pinia 状态，在大属性列表时造成卡顿。无痕模式或禁用扩展可解决。
- `scene.pick()` 对大型 BIM 模型（>100MB GPU 数据）存在不可避免的延迟。

## 开发命令

```bash
pnpm install    # 安装依赖
pnpm dev        # 启动开发服务器 (默认 5180 端口)
pnpm build      # 构建生产版本
```
