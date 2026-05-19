# AITOS IDE 架构设计

## 核心理念

AITOS IDE 不是一个传统的代码编辑器，而是一个**运行时可视化调试器**。

所有 AITOS 应用的执行都经过 `runtime.executeGraph`——这是系统唯一的总入口。在总入口加一个钩子，IDE 就能实时追踪任何 AITOS 应用的执行流程。

## 布局

```
┌──────────────────────────────────────────────────────────────┐
│ 左侧：架构图面板        中间：目标应用        右侧：AI 对话   │
│                                                              │
│ ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│ │ 执行流向图     │    │ 嵌入的目标  │    │ "帮我加一个  │    │
│ │              │    │ AITOS 应用  │    │  发送按钮"   │    │
│ │ click →      │    │             │    │              │    │
│ │ event-loop → │    │ [输入框]    │    │ AI: "好的"   │    │
│ │ delegate →   │    │ [发送] ←──  │    │              │    │
│ │ send →       │    │             │    │ 编了一个图   │    │
│ │ render       │    │ 用户点击    │    │ 已保存        │    │
│ │              │    │     ↓       │    │              │    │
│ │ ← 节点高亮   │    │ 发送成功    │    │              │    │
│ └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 实现步骤

### 第一步：`@aitos/core` — 加一行钩子

在 `runtime.ts` 的 `AitosRuntime` 类中添加：

```typescript
// AitosRuntime 新增属性
onNodeExecute?: (trace: TraceEvent) => void;

// executeGraph 内部，每个节点执行后（第 239 行之后）
this.onNodeExecute?.({
  traceId: crypto.randomUUID(),
  timestamp: Date.now(),
  graph: gName,
  node: nodeId,
  atom: node.atom,
  input: input,
  output: result.success ? result.data : { __error: result.error },
  duration: duration,
});
```

**所有 AITOS 应用的每次节点执行都会触发这个回调。** 一行代码，全覆盖。

### 第二步：`@aitos/core` — 加缓冲区原子

新增三个原子（归入 `telemetry.ts` 或 `control.ts`）：

| 原子 | 功能 |
|------|------|
| `getRecentTraces(count?)` | 返回最近 N 条追踪记录 |
| `startTracing()` | 开启追踪 |
| `stopTracing()` | 关闭追踪 |

这些原子让 IDE 能以 Atom 方式读取追踪数据。

### 第三步：构建 IDE

IDE 本身是一个 AITOS 应用。布局：

```
ide/
├── main.acs           # 三栏布局
├── graph-panel/
│   ├── create.acs     # 左侧流向图渲染
│   └── styles.acs
├── app-frame/
│   └── create.acs     # 中间 iframe 嵌入目标应用
└── chat/
    └── create.acs     # 右侧标准聊天界面
```

左侧面板读取 `getRecentTraces()` 的数据，渲染成流向图。
核心渲染逻辑在 `graph-panel/create.acs` 中，每个 `TraceEvent` 渲染为一个节点，按 `traceId` 分组连线。

### 关键设计决策

1. **钩子在 `@aitos/core`，不在应用层** — 任何 AITOS 应用被 IDE 载入都能追踪
2. **IDE 本身也是 AITOS 应用** — 自举：IDE 打开自己也能看到自己的流向
3. **AI 对话集成** — 右侧 AI 在编图时，左侧同步显示它正在创建的图结构
4. **不锁定渲染样式** — 流向图、地铁图、树图都是同一个数据源的不同展示，可切换

### 与传统 IDE 的差异

| 特性 | VS Code / Cursor | AITOS IDE |
|------|-----------------|-----------|
| 架构图来源 | 静态代码分析 | 运行时实时追踪 |
| 数据流展示 | 静态调用链 | 每次执行的实际路径 |
| 响应时间 | 代码保存后刷新 | 执行时即时更新 |
| 对应用要求 | 无特殊要求 | 必须是 AITOS 应用 |
| 实现复杂度 | hook 所有函数 | hook 一个 executeGraph |
