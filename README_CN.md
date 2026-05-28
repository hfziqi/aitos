<p align="center">
  <img src="./aitos.jpg" width="120" alt="AITOS Logo">
</p>

<h1 align="center">AITOS</h1>

<p align="center">
  AI Agent 执行运行时 — 让 AI 直接操作计算机，而不仅仅是返回文本。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@aitos/core"><img src="https://img.shields.io/npm/v/@aitos/core" alt="npm"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

---

## AITOS 是什么？

AITOS 提供了 **153 个原子**（最小操作单元），分布在 8 个包中，AI 可以将它们组合成 **图**（程序），运行时直接执行这些图。把它想象成 **AI 的指令集** —— 就像 x86 是 CPU 的指令集，AITOS 是 AI Agent 的指令集。

### 与 Function Calling / LangChain 的区别

| | Function Calling / LangChain | AITOS |
|---|---|---|
| **AI 输出** | JSON（调用预定义函数） | Graph（AI 自己生成的程序） |
| **执行方式** | 一次调用一个 | 图引擎执行完整程序 |
| **AI 能操作什么** | 你定义的 API | DOM、Canvas、文件系统、传感器... |
| **AI 能力** | 调用你预设的函数 | 组合原子创造新功能 |
| **格式** | JSON Schema | ACS（紧凑语法，比 JSON 小 5-10 倍） |

## 30 秒演示

```typescript
import { AitosRuntime, compileAcs, allAtoms } from 'aitos'

const runtime = new AitosRuntime()
allAtoms.forEach(a => runtime.register(a))

// AI 生成这个图 —— 使用 ACS 紧凑语法
const graph = compileAcs(`
  graph hello {
    let createDiv = createElement(tag: "div", id: "hello")
    let setText = setTextContent(id: "hello", text: "Hello from AI!")
    let setColor = setStyles(id: "hello", styles: { color: "blue", fontSize: "24px" })
    let append = appendChild(parentId: "app", childId: "hello")
  }
`)

await runtime.executeGraph(graph, context)
// → 页面上出现蓝色的 "Hello from AI!"
```

AI 不需要 React 组件、JSX 或构建工具 —— 它只需要将原子组合成图，运行时执行它。

## 演示应用

**[LinkArm](./linkarm)** — 一个功能完整的 AI 聊天应用，完全用 AITOS 原子构建。没有 React、没有 Vue、没有组件框架。每个 UI 元素都由原子创建：`createElement`、`setStyles`、`appendChild`、`setTextContent`。

<p align="center">
  <img src="./linkarm/linkarm-1.png" width="45%" alt="LinkArm - 添加 AI 模型">
  <img src="./linkarm/linkarm-2.png" width="45%" alt="LinkArm - 聊天界面">
</p>

## 快速开始

**前置条件**：Node.js 18+

### Web 版

```bash
# 1. 克隆仓库
git clone https://github.com/hfziqi/aitos.git
cd aitos

# 2. 安装依赖并构建包
cd packages/@aitos/core && npm install && npm run build && cd ../..

# 3. 运行演示应用
cd linkarm && npm install && npm run dev
```

在浏览器中打开 http://localhost:7890。

### Windows 桌面版

**前置条件**：Node.js 18+、CMake 3.15+、Visual Studio 2022（含 C++ 桌面开发工作负载）

```bash
# 1. 安装依赖并构建包
cd packages/@aitos/core && npm install && npm run build && cd ../..

# 2. 构建 Web 前端
cd linkarm && npm install && npm run build && cd ..

# 3. 解压 WebView2 SDK
cd linkarm-desktop
# 将 webview2.zip 解压到当前目录（如已解压则跳过）

# 4. CMake 构建
mkdir build && cd build
cmake ..
cmake --build . --config Release

# 5. 运行
cd bin/Release
./LinkArm.exe
```

或使用一键脚本（自动完成步骤 1-4）：

```bash
cd linkarm && npm run desktop:build
```

**开发模式**（Vite 热更新 + 桌面窗口）：

```bash
cd linkarm && npm run desktop:dev
```

**你将看到**：LinkArm —— 一个完全用 AITOS 原子构建的 AI 聊天应用。添加你的 AI 模型（OpenAI 兼容 API）即可开始聊天。

## 核心概念

### Atom（原子）—— 最小操作单元

每个原子只做一件事。AI 可以调用任何原子，或将多个原子组合成图。

```typescript
interface Atom {
  name: string;           // 例如 "createElement", "add", "httpRequest"
  version: string;
  meta: {
    input: Array<{ name: string; type: string; description?: string }>;
    output: { type: string; description?: string };
  };
  execute: (input: any, context: Context) => Promise<Result>;
}
```

### Graph（图）—— AI 生成的程序

图定义了使用原子的执行流程。AI 生成图，运行时执行它们。

**ACS 语法**（紧凑、AI 友好）：

```
graph chat {
  let getUserInput = getValue(id: "inputBox")
  if getUserInput {
    let callAI = httpStreamRequest(url: "{{apiUrl}}", body: "{{getUserInput}}")
    let showResponse = setTextContent(id: "output", text: "{{callAI.content}}")
  }
}
```

等效的 JSON（大 5-10 倍）：

```json
{
  "order": ["getUserInput", "branch"],
  "nodes": {
    "getUserInput": { "atom": "getValue", "id": "inputBox" },
    "branch": {
      "atom": "branch",
      "cond": "{{getUserInput}}",
      "then": {
        "order": ["callAI", "showResponse"],
        "nodes": {
          "callAI": { "atom": "httpStreamRequest", "url": "{{apiUrl}}", "body": "{{getUserInput}}" },
          "showResponse": { "atom": "setTextContent", "id": "output", "text": "{{callAI.content}}" }
        }
      }
    }
  }
}
```

使用 `{{nodeId}}` 或 `{{nodeId.field}}` 引用另一个节点的输出。

## 内置原子（153 个）

### 核心（66 个原子）

| 类别 | 原子 |
|----------|-------|
| **状态** | `get`, `set`, `setGlobal` |
| **计算** | `add`, `sub`, `mul`, `div`, `mod`, `random` |
| **判断** | `eq`, `gt`, `lt`, `gte`, `lte`, `and`, `or`, `not`, `isNil`, `isNum`, `isStr`, `isArr`, `isObj` |
| **控制** | `branch`, `loop`, `forEach`, `exec`, `execGraph`, `execFile`, `wait`, `log`, `getSkillSet`, `compileAcs`, `executeInContext` |
| **操作** | `concat`, `split`, `len`, `push`, `pop`, `slice`, `getProp`, `setProp`, `keys`, `values`, `merge`, `filter`, `format`, `toNum`, `contains`, `includes`, `startsWith`, `replace`, `trim`, `toLower`, `toUpper`, `getAt`, `join` |
| **时间** | `now`, `timestampToDate`, `getMonthDays`, `isLeapYear` |
| **工具调用** | `handleToolCalls` |
| **遥测** | `getTelemetryStats`, `resetTelemetry`, `flushTelemetry`, `getTraceLog`, `analyzeTelemetry` |

### 扩展包（87 个原子）

| 包 | 原子数 | 描述 |
|---------|-------|-------------|
| **@aitos/output** | 56 | DOM 操作、Canvas 2D、通知、Markdown 渲染 |
| **@aitos/input** | 7 | 鼠标、触摸、键盘、文件选择 |
| **@aitos/store** | 6 | localStorage、图管理 |
| **@aitos/transfer** | 2 | HTTP 请求、SSE 流 |
| **@aitos/sense** | 5 | 加速度计、陀螺仪、地理位置、电池、网络 |
| **@aitos/bridge** | 5 | 系统信息、窗口控制（最小化、最大化、关闭、拖动） |
| **@aitos/bridge-desktop** | 6 | 桌面文件读写、命令执行、ZIP 读取 |

## 架构

```
┌─────────────────────────────────────────┐
│             应用层                      │
│  ┌─────────────────────────────────┐   │
│  │       Graph (ACS / JSON)        │   │
│  │  ┌─────┐     ┌─────┐           │   │
│  │  │Atom1│────→│Atom2│────→ ...  │   │
│  │  └─────┘     └─────┘           │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│           AITOS 运行时                  │
│  ┌──────────┐  ┌──────────────────┐    │
│  │ ACS      │  │ Graph 执行器     │    │
│  │ 解析器   │  │ + 验证器         │    │
│  │ 编译器   │  │ + 引用解析       │    │
│  └──────────┘  └──────────────────┘    │
├─────────────────────────────────────────┤
│  核心 (66)   │  扩展包                   │
│  - state     │  - @aitos/input (7)      │
│  - control   │  - @aitos/output (56)    │
│  - judgment  │  - @aitos/store (6)      │
│  - calc      │  - @aitos/transfer (2)   │
│  - manip     │  - @aitos/sense (5)      │
│  - time      │  - @aitos/bridge (5)     │
│  - toolcalls │  - @aitos/bridge-desktop (6)│
│  - telemetry │                             │
└─────────────────────────────────────────┘
```

## 高级特性

### 后生图系统 (Growth System)

后生图是 AI 生成的自我进化程序——可以被保存、共享和复用。

| 机制 | 描述 |
|-----------|-------------|
| **`save-growth`** | 保存 AI 生成的图为可复用的后生图 |
| **`list-growths`** | 列出所有可用的后生图 |
| **`open-growth`** | 打开并激活已保存的后生图 |
| **`callGrowthTool`** | AI 可以动态调用任意 tool 类型的后生图，无需显式配置 |

后生图分为两种类型：
- **`app`** — 面向用户的 UI 应用（显示在侧边栏）
- **`tool`** — AI 可调用的函数（显示在图市场中）

### 图市场 (Graph Market)

内置市场，用户可以：
- **添加模型** — 配置 AI 模型（OpenAI 兼容 API）
- **导入包** — 导入包含后生图（.acs 文件）的 .zip 包，自动编译并注册
- **发现** — 浏览可用的 tool 类型后生图

从市场导入的每个后生图立即可用——要么在侧边栏（app 类型），要么作为 AI 可调用的工具（tool 类型）。

### Bridge Desktop（桌面桥接）

`@aitos/bridge` 和 `@aitos/bridge-desktop` 包使 AI 能够操作本地桌面环境：

- **窗口控制** — 最小化、最大化、关闭、拖动窗口
- **系统信息** — 查询 OS、平台、环境
- **文件 I/O** — 读取、写入、列出、删除本地文件
- **命令执行** — 运行 Shell 命令
- **ZIP 读取** — 提取和读取 .zip 包文件

这将 AITOS 从仅限浏览器的运行时转变为 AI Agent 的**桌面操作环境**。

## AI 集成

AITOS 设计为与任何支持 Function Calling 的 LLM 配合使用：

1. **`getSkillSet`** — 返回所有可用原子的 JSON 描述。将其作为工具提供给 AI。
2. **`handleToolCalls`** — 处理 AI 的 tool_calls 响应，执行请求的原子，并支持通过 `callGrowthTool` 动态路由到 tool 类型的后生图。
3. **`execGraph`** — AI 可以生成并执行完整的图，而不仅仅是单个函数调用。

示例流程：
```
用户 → AI → getSkillSet() → [AI 看到所有原子 + 后生图工具]
用户 → AI → AI 生成图 → execGraph(graph) → 结果
                              → callGrowthTool(名称, 参数) → 执行已保存的后生图
```

### `callGrowthTool` — AI 可调用的后生图

Tool 类型的后生图会自动暴露为 AI 可调用的工具。当 AI 需要已保存后生图中实现的功能（如"雨天检测算法"）时，运行时通过 `callGrowthTool` 将请求路由到匹配的后生图，执行并返回结果。这使得 AI 可以**复用预先组合好的图**，而不是每次从零生成。

## 使用场景

- **操作 UI 的 AI Agent** — AI 直接创建和操作 DOM 元素
- **AI 桌面助手** — AI 控制窗口、读取文件、执行命令
- **AI 驱动的应用** — AI 可以在运行时修改逻辑的应用
- **快速原型开发** — 用原子构建功能性 UI，无需框架

## 许可证

MIT