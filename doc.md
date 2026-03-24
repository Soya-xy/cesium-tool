# Cesium 3D Tiles 调试平台 — 功能规划文档

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 + TypeScript + Vite |
| 3D引擎 | CesiumJS (最新版) |
| UI组件库 | Element Plus |
| 状态管理 | Pinia |
| 样式 | UnoCSS |
| 底图 | 天地图卫星影像 (WMTS) |

### 天地图配置

- **Key**: `789e558be762ff832392a0393fd8a4f1`
- **卫星影像**: `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={TileCol}&TILEROW={TileRow}&TILEMATRIX={TileMatrix}&tk=789e558be762ff832392a0393fd8a4f1`
- **影像注记**: `https://t{s}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={TileCol}&TILEROW={TileRow}&TILEMATRIX={TileMatrix}&tk=789e558be762ff832392a0393fd8a4f1`

---

## 一、核心模块划分

### 1. 模型加载与管理模块

- 通过 URL 输入加载 `tileset.json`
- 本地文件拖拽上传加载
- 多模型同时加载、列表管理（显示/隐藏/删除/重命名）
- 模型加载状态反馈（进度条、错误提示）
- 模型参数导入/导出为 JSON 配置文件

### 2. 模型属性调试面板

#### 基础属性

- 模型名称、URL、类型
- 位置调整（经度、纬度、高度 — 数值输入 + 鼠标拖拽）
- 旋转（heading / pitch / roll 滑块 + 数值）
- 缩放（uniform scale + xyz 独立缩放）
- 模型原点偏移（modelMatrix 调整）

#### 渲染属性

- `maximumScreenSpaceError`（精细度控制滑块）
- `maximumMemoryUsage`
- `skipLevelOfDetail` 开关
- `preferLeaves` 开关
- `dynamicScreenSpaceError` 开关
- `foveatedScreenSpaceError` 相关参数
- `cullWithChildrenBounds` 开关
- `progressiveResolutionHeightFraction`

#### 样式属性

- 整体颜色覆盖（ColorBlendMode: HIGHLIGHT / REPLACE / MIX）
- 整体透明度调节
- 背面剔除开关（backFaceCulling）
- 阴影开关（shadows: ENABLED / CAST_ONLY / RECEIVE_ONLY / DISABLED）

#### 调试属性（参考 Cesium3DTilesInspector）

- 显示包围盒（showBoundingVolume）
- 显示内容包围盒（showContentBoundingVolume）
- 显示请求包围盒（showRequestVolume）
- 随机着色瓦片（debugColorizeTiles）
- 冻结帧（debugFreezeFrame）
- 显示几何误差（debugShowGeometricError）
- 显示渲染统计（debugShowRenderingStatistics）
- 显示内存使用（debugShowMemoryUsage）
- 显示 URL 信息（debugShowUrl）
- 线框模式（wireframe）

### 3. 点击交互模块

#### 构件高亮

- 左键点击模型构件 → 高亮选中（通过 `Cesium3DTileFeature.color` 设置高亮色）
- 自定义高亮颜色和透明度
- 多选模式（Ctrl+点击）
- 悬停预高亮（hover highlight）

#### Popup 弹窗

- 点击构件后在 3D 场景中显示 Vue 组件弹窗
- 显示构件所有属性信息（遍历 `feature.getPropertyIds()` / `feature.getProperty()`）
- 属性信息以 key-value 表格展示
- 支持属性搜索/过滤
- 支持复制属性值
- 弹窗跟随构件位置（通过 `viewer.scene.cartesianToCanvasCoordinates` 实现）

### 4. 右键上下文菜单

#### 4.1 查看此处坐标

- 显示点击位置的经纬度（WGS84）、笛卡尔坐标、海拔高度
- 多种坐标格式切换（度分秒 / 十进制度）
- 一键复制坐标

#### 4.2 查看当前视角

- 显示当前相机的 position、heading、pitch、roll
- 一键复制视角参数（JSON格式）
- 保存/恢复视角书签

#### 4.3 图上量算（子菜单）

- 空间距离量算
- 贴地距离量算
- 水平距离量算
- 面积量算（贴地/空间）
- 体积量算（挖方/填方）
- 高度差量算
- 三角量算
- 坡度/坡向分析

#### 4.4 图上标记（子菜单）

- 点标记（自定义图标）
- 线标记（折线/曲线）
- 面标记（多边形）
- 文字标注
- 模型标注（放置小型 glTF 模型）

#### 4.5 视角切换（子菜单）

- 俯视图（Top View）
- 前视图 / 后视图 / 左视图 / 右视图
- 自由视角
- 第一人称漫游
- 绕模型旋转
- 飞行定位到模型

#### 4.6 特效效果（子菜单）

- 泛光效果（Bloom）
- 环境光遮蔽（SSAO / Ambient Occlusion）
- 阴影（实时阴影 + 日照分析）
- 雾效
- 大气散射
- HDR 开关
- FXAA 抗锯齿开关
- 描边效果（Silhouette / PostProcess Outline）

#### 4.7 地形服务（子菜单）

- 地形图层选择（Cesium World Terrain / 自定义地形）
- 地形夸张倍率（terrainExaggeration）
- 地形深度检测开关（depthTestAgainstTerrain）
- 地形透明度
- 等高线显示

#### 4.8 当前图层（子菜单）

- 底图切换（天地图 / 高德 / Bing / OSM / 自定义 WMTS/WMS）
- 图层透明度
- 图层叠加顺序
- 注记图层开关

#### 4.9 场景设置（子菜单）

- 场景背景色
- 天空盒开关
- 太阳/月亮显示
- 星空显示
- 地球/大气层显示开关
- 时间轴控制（用于日照分析）
- 帧率显示
- 性能监视器

### 5. BIM 分层展示模块

#### 楼层分解展示

- 自动识别 BIM 模型的楼层信息（通过 BatchTable 属性如 `floor`、`level`、`storey`）
- 手动定义楼层分割高度
- 爆炸图模式 — 各楼层按比例分离展示（通过修改每个 feature 的 modelMatrix 或使用 `Cesium3DTileStyle` 条件显示）
- 楼层展开间距可调（滑块控制）
- 楼层展开动画效果

#### 楼层信息面板

- 楼层列表（树形结构）
- 每层包含的构件数量
- 每层高度信息：
  - **楼层自身高度**（层高）
  - **楼层底面到地面的绝对高度**（海拔）
  - **楼层底面到模型底部的相对高度**
  - **楼层顶面到地面的绝对高度**（海拔）
  - **楼层顶面到模型底部的相对高度**
  - **楼层中心标高**
- 点击楼层名 → 相机飞行到对应楼层
- 单独显示/隐藏某一楼层
- 楼层颜色主题（按楼层赋不同颜色）

#### 构件分类浏览

- 按 IFC 类别分组（墙体 / 楼板 / 门窗 / 管线 / 结构柱梁 等）
- 按材质分组
- 按系统分组（建筑/结构/机电）
- 分类过滤显示/隐藏

### 6. 模型信息统计面板

#### 基础信息

- tileset.json 版本
- 几何误差（geometricError）
- 瓦片总数 / 已加载瓦片数
- 总三角形数 / 总顶点数
- 纹理内存占用
- 几何内存占用
- 总内存占用

#### 空间信息

- 模型包围盒（BoundingSphere / OrientedBoundingBox）
- 模型中心点坐标（经纬度 + 笛卡尔）
- 模型尺寸（长/宽/高 米）
- 模型底面海拔高度
- 模型顶面海拔高度

#### 性能信息（实时更新）

- 当前帧率（FPS）
- 当前加载的瓦片数
- 待加载瓦片队列数
- GPU 内存使用
- 渲染三角形数
- 绘制调用数（Draw Calls）

### 7. 模型剖切分析模块

- X / Y / Z 三轴裁剪面（ClippingPlane）
- 自由裁剪面（自定义法线方向）
- 裁剪面位置滑块调节
- 多裁剪面组合
- 裁剪面可视化显示
- 剖切面填充颜色

### 8. 条件样式编辑器

- 可视化编写 `Cesium3DTileStyle`
- 按属性值条件着色
- 按属性值条件显示/隐藏
- 支持 pointSize 等点云属性
- 样式代码编辑器（Monaco Editor 嵌入）
- 样式预览实时生效
- 样式导入/导出

---

## 二、UI 布局

```
┌──────────────────────────────────────────────────────────┐
│  顶部工具栏: 模型URL输入 | 加载 | 工具按钮组              │
├──────────┬────────────────────────────┬───────────────────┤
│          │                            │                   │
│  左侧面板 │      Cesium 3D 场景        │    右侧面板        │
│  (可折叠)  │                            │    (可折叠)        │
│          │                            │                   │
│ · 模型列表 │    [右键菜单浮层]           │  · 属性调试面板    │
│ · BIM楼层 │    [Popup弹窗]             │  · 模型信息面板    │
│ · 构件树  │                            │  · 样式编辑器      │
│          │                            │  · 剖切控制面板    │
│          │                            │                   │
├──────────┴────────────────────────────┴───────────────────┤
│  底部状态栏: 坐标 | 海拔 | 帧率 | 相机高度 | 瓦片统计      │
└──────────────────────────────────────────────────────────┘
```

---

## 三、关键技术实现要点

| 功能 | 实现方式 |
|------|---------|
| 构件拾取 | `viewer.scene.pick()` → `Cesium3DTileFeature` |
| 构件高亮 | `feature.color = Cesium.Color.YELLOW.withAlpha(0.6)` |
| Popup定位 | `scene.cartesianToCanvasCoordinates()` + Vue Teleport |
| 右键菜单 | `viewer.screenSpaceEventHandler` RIGHT_CLICK + Vue组件 |
| BIM分层 | 遍历 `tileset.root` 递归获取 tile，按 BatchTable 属性分组 |
| 楼层爆炸 | 修改对应 feature 的 modelMatrix translation |
| 高度计算 | `Cesium.Cartographic.fromCartesian()` + `sampleTerrainMostDetailed()` |
| 剖切面 | `Cesium.ClippingPlaneCollection` |
| 条件样式 | `new Cesium.Cesium3DTileStyle({ color: { conditions: [...] } })` |
| 量算工具 | `Cesium.EllipsoidGeodesic` / `PolygonHierarchy` 面积计算 |
| 天地图底图 | `Cesium.WebMapTileServiceImageryProvider` (WMTS) |

---

## 四、项目结构

```
cesium-tool/
├── doc.md                          # 本文档
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── env.d.ts
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── config/
│   │   └── tianditu.ts             # 天地图配置（Key、图层URL）
│   ├── components/
│   │   ├── cesium/                  # Cesium 场景相关
│   │   │   ├── CesiumViewer.vue    # 核心Cesium容器
│   │   │   ├── ContextMenu.vue     # 右键上下文菜单
│   │   │   └── PopupOverlay.vue    # 弹窗覆盖层
│   │   ├── panels/                  # 侧边面板组件
│   │   │   ├── ModelList.vue       # 模型列表管理
│   │   │   ├── PropertyEditor.vue  # 属性调试面板
│   │   │   ├── DebugPanel.vue      # 调试选项面板
│   │   │   ├── BimFloorPanel.vue   # BIM楼层面板
│   │   │   ├── ModelInfoPanel.vue  # 模型信息统计
│   │   │   ├── StyleEditor.vue     # 条件样式编辑器
│   │   │   └── ClippingPanel.vue   # 剖切控制面板
│   │   ├── tools/                   # 工具组件
│   │   │   ├── MeasureTools.vue    # 量算工具
│   │   │   ├── MarkTools.vue       # 标记工具
│   │   │   └── ViewSwitcher.vue    # 视角切换
│   │   ├── toolbar/                 # 顶部工具栏
│   │   │   └── TopToolbar.vue
│   │   ├── statusbar/               # 底部状态栏
│   │   │   └── StatusBar.vue
│   │   └── common/                  # 通用UI组件
│   │       ├── CollapsiblePanel.vue
│   │       └── SliderInput.vue
│   ├── composables/                 # 组合式函数
│   │   ├── useCesium.ts            # Cesium viewer 初始化与管理
│   │   ├── useTileset.ts           # 3DTiles 加载与属性管理
│   │   ├── usePicking.ts           # 拾取与高亮交互
│   │   ├── useBimFloor.ts          # BIM 楼层解析与爆炸图
│   │   ├── useMeasure.ts           # 量算工具逻辑
│   │   ├── useClipping.ts          # 剖切面逻辑
│   │   ├── useContextMenu.ts       # 右键菜单逻辑
│   │   └── useSceneEffect.ts       # 场景特效控制
│   ├── stores/                      # Pinia 状态管理
│   │   ├── cesiumStore.ts          # Cesium viewer 全局状态
│   │   ├── tilesetStore.ts         # 模型列表与当前选中状态
│   │   └── toolStore.ts            # 工具激活状态
│   ├── utils/                       # 工具函数
│   │   ├── coordinate.ts           # 坐标转换工具
│   │   ├── tilesetHelper.ts        # tileset 信息解析
│   │   └── styleBuilder.ts         # 样式条件构造器
│   └── styles/
│       └── global.css
└── public/
    └── favicon.ico
```

---

## 五、实现优先级（分阶段）

### Phase 1 — 基础框架（MVP）

1. Vue 3 + Vite + Cesium 项目搭建
2. 天地图卫星底图加载（默认打开显示地图）
3. 通过 URL 加载 3DTiles 模型
4. 模型基础属性面板（位置/旋转/缩放）
5. 底部状态栏（坐标/海拔/帧率）

### Phase 2 — 交互功能

6. 点击构件高亮 + Popup 弹窗
7. 右键上下文菜单（坐标/视角/量算/标记）
8. 模型调试属性面板（包围盒/线框/冻结帧等）
9. 模型渲染属性面板（精细度/LOD/内存等）

### Phase 3 — BIM 高级功能

10. BIM 楼层解析与分层展示
11. 楼层爆炸图模式
12. 楼层高度信息计算（到地面/到底部）
13. 构件分类浏览（IFC类别/材质/系统）

### Phase 4 — 专业工具

14. 模型剖切分析（多轴裁剪面）
15. 条件样式编辑器（可视化 + 代码编辑器）
16. 特效控制（Bloom/SSAO/阴影/雾效）
17. 地形服务管理
18. 图层管理
19. 场景设置

### Phase 5 — 完善优化

20. 模型参数导入/导出
21. 视角书签管理
22. 性能监控面板
23. 多模型管理与对比
24. 键盘快捷键支持
