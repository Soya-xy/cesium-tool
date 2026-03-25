# Cesium Tool

一个基于 Vue 3、CesiumJS、Element Plus 与 Pinia 的 3D Tiles 调试工具，用来快速加载模型、查看构件属性、做基础量算/标注，并对场景和模型参数进行调试。

## 功能介绍

### 模型加载

- 支持通过 `tileset.json` URL 加载 3D Tiles 模型
- 支持拖放本地 3D Tiles 文件夹到场景中加载
- 支持多模型并存、切换当前激活模型
- 支持模型显隐、删除、飞行定位

### 构件拾取与属性查看

- 左键拾取 3D Tiles 构件
- 鼠标悬停高亮开关
- 构件属性弹窗展示 `feature.getPropertyIds()` 返回的属性
- 支持复制属性值
- 支持显示点击位置坐标、楼层、离地高度
- 属性弹窗支持拖动

### 右键菜单

- 查看此处坐标
- 查看当前视角
- 图上量算
  - 空间距离
  - 水平距离
  - 面积量算
  - 高度差
- 图上标记
  - 点标记
  - 线标记
  - 面标记
  - 文字标注
- 视角切换
  - 俯视图
  - 正南视角
  - 重置视角
- 特效效果
  - Bloom
  - FXAA
  - 实时阴影
- 地形服务
  - 深度检测
- 场景设置
  - 大气层
  - 太阳
  - 月亮
  - 星空

### BIM 分层

- 自动探测 `F1` 到 `F20` 子目录中的楼层 tileset
- 进入分层模式后按楼层分别加载
- 支持单层显隐、只看当前层、飞到当前层
- 支持读取 `floor.json` 中的建筑信息列表

### 调试与状态信息

- 模型渲染参数调节
  - `maximumScreenSpaceError`
  - `maximumMemoryUsage`
  - 背面剔除
- 调试开关
  - 包围盒
  - 内容包围盒
  - 随机着色瓦片
  - 冻结帧
  - 线框模式
- 实时显示
  - 鼠标经纬度 / 海拔
  - 相机高度
  - FPS
  - 模型基础统计与内存占用

## 技术栈

- Vue 3
- TypeScript
- Vite 8
- CesiumJS 1.139
- Element Plus
- Pinia

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发环境

```bash
pnpm dev
```

### 3. 构建生产版本

```bash
pnpm build
```

### 4. 本地预览构建结果

```bash
pnpm preview
```

## 开发指南

### 开发入口

- 默认示例模型地址写在顶部工具栏中：`/map/tileset.json`
- 场景容器入口组件为 `src/components/cesium/CesiumViewer.vue`
- 应用整体布局在 `src/App.vue`

### 常见开发任务

#### 新增右键菜单功能

1. 在 `src/composables/useContextMenu.ts` 中增加菜单项
2. 如果需要绘制交互，接入 `src/composables/useDrawingTools.ts`
3. 如需新增几何绘制效果，可在 `src/utils/drawingEntities.ts` 中补充实体创建逻辑

#### 新增模型调试项

1. 在 `src/components/panels/PropertyEditor.vue` 添加控件
2. 通过 `src/composables/useTileset.ts` 的 `updateTilesetProperty()` 写入 Cesium tileset 属性

#### 修改构件弹窗

- 组件位置：`src/components/cesium/PopupOverlay.vue`
- 选中逻辑与弹窗定位：`src/composables/usePicking.ts`

#### 修改底图

- 天地图配置在 `src/config/tianditu.ts`
- Viewer 初始化逻辑在 `src/composables/useCesium.ts`

### 本地文件夹拖放加载说明

本地拖放不是简单地把文件复制到项目目录，而是：

1. 递归读取拖入目录中的文件树
2. 将文件缓存到内存 `Map`
3. 拦截 Cesium 的 XHR / `fetch`
4. 通过虚拟前缀 `/__local_tiles__/` 向 Cesium 提供资源

对应实现位于 `src/composables/useLocalTileset.ts`。

## 项目架构

### 目录结构

```text
src/
├── App.vue
├── main.ts
├── config/
│   └── tianditu.ts
├── components/
│   ├── cesium/
│   │   ├── CesiumViewer.vue
│   │   ├── ContextMenu.vue
│   │   └── PopupOverlay.vue
│   ├── panels/
│   │   ├── BimFloorPanel.vue
│   │   ├── DebugPanel.vue
│   │   ├── ModelInfoPanel.vue
│   │   ├── ModelList.vue
│   │   └── PropertyEditor.vue
│   ├── statusbar/
│   │   └── StatusBar.vue
│   └── toolbar/
│       └── TopToolbar.vue
├── composables/
│   ├── useBimFloor.ts
│   ├── useCesium.ts
│   ├── useContextMenu.ts
│   ├── useDrawingTools.ts
│   ├── useFeatureVisualizer.ts
│   ├── useLocalTileset.ts
│   ├── usePicking.ts
│   └── useTileset.ts
├── stores/
│   ├── cesiumStore.ts
│   ├── interactionStore.ts
│   └── tilesetStore.ts
├── styles/
│   └── global.css
└── utils/
    ├── coordinate.ts
    ├── drawingEntities.ts
    ├── measure.ts
    └── tilesetHelper.ts
```

### 模块职责

#### 1. 视图层

- `App.vue`
  - 负责整体布局、左右面板切换、顶部工具栏和底部状态栏
- `components/cesium/*`
  - 负责 Cesium 场景 UI、右键菜单、构件弹窗
- `components/panels/*`
  - 负责模型管理、BIM 分层、调试项与统计信息展示

#### 2. 交互层

- `useCesium.ts`
  - 初始化 `Cesium.Viewer`
  - 挂载天地图影像与注记图层
  - 跟踪鼠标与相机信息
- `usePicking.ts`
  - 处理悬停高亮、左键拾取、属性弹窗定位
- `useContextMenu.ts`
  - 注册右键菜单事件
  - 组装菜单项与行为
- `useDrawingTools.ts`
  - 处理量算和标注的绘制流程
  - 统一管理左键取点、右键结束、预览实体
- `useBimFloor.ts`
  - 管理 BIM 楼层模式、楼层 tileset 加载与切换
- `useLocalTileset.ts`
  - 负责本地文件夹拖放与资源拦截

#### 3. 状态层

- `cesiumStore.ts`
  - 全局持有 `viewer`
- `tilesetStore.ts`
  - 管理已加载模型、激活模型、选中构件与属性数据
- `interactionStore.ts`
  - 管理当前绘制模式与右键菜单互斥状态

#### 4. 工具层

- `coordinate.ts`
  - 坐标转换与格式化
- `measure.ts`
  - 距离、面积、高差等计算
- `drawingEntities.ts`
  - 量算/标记实体和预览实体生成
- `tilesetHelper.ts`
  - 模型统计信息提取与格式化

## Feature 设计说明

### Feature 1: 模型加载与模型列表

- 顶部输入 URL 加载模型
- 左侧模型列表管理多个 tileset
- 所有模型对象通过 Pinia 统一管理

### Feature 2: 构件属性查看

- `scene.pick()` 负责拾取
- 选中后异步读取 feature 属性
- 弹窗使用 `v-show` 保持存活，减少频繁挂载成本

### Feature 3: 图上量算与标记

- 使用独立的交互模式避免和普通拾取冲突
- 通过 `ScreenSpaceEventHandler` 管理绘制流程
- 支持预览线、面、标签和最终结果实体

### Feature 4: BIM 分层模式

- 主模型和楼层模型分离管理
- 进入分层模式时隐藏总模型，显示逐层 tileset
- 支持楼层隔离、显隐和相机定位

### Feature 5: 模型调试面板

- 右侧属性面板用于常用 tileset 参数调试
- 右侧调试面板用于场景开关和后处理效果切换
- 信息面板每秒刷新模型统计数据

## 当前限制与说明

- 当前 README 只描述仓库中已经实现的能力，不把规划功能写成现状
- `pnpm build` 可通过，但构建输出里仍有来自依赖包的 `eval` 与大体积 chunk 警告，这些不是当前项目逻辑错误
- BIM 分层依赖数据目录结构，默认约定为主 tileset 同级存在 `F1/F2/.../tileset.json`

## 建议的后续扩展

- 为量算/标记增加清除、编辑和历史管理
- 给属性弹窗增加搜索和筛选
- 为模型参数编辑增加导入/导出配置
- 给右键菜单增加更多场景书签和分析工具

## 参考文件

- 规划文档：`doc.md`
- 项目说明：`CLAUDE.md`
