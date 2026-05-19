<p align="center">
  <img src="./aitos.jpg" width="120" alt="AITOS Logo">
</p>

<h1 align="center">AITOS</h1>

<p align="center">
  AI Agent execution runtime — let AI directly operate the computer, not just return text.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@aitos/core"><img src="https://img.shields.io/npm/v/@aitos/core" alt="npm"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

---

## What is AITOS?

AITOS provides **153 atoms** (minimal operation units) across 8 packages, that AI can compose into **graphs** (programs), and a runtime that executes graphs directly. Think of it as the **instruction set for AI** — just as x86 is the instruction set for CPU, AITOS is the instruction set for AI agents.

### How it differs from Function Calling / LangChain

| | Function Calling / LangChain | AITOS |
|---|---|---|
| **AI output** | JSON (calls predefined functions) | Graph (program AI generates itself) |
| **Execution** | One call at a time | Graph engine executes the full program |
| **What AI can operate** | APIs you define | DOM, Canvas, filesystem, sensors, ... |
| **AI capability** | Call functions you preset | Compose atoms to create new functionality |
| **Format** | JSON schema | ACS (compact syntax, 5-10x smaller than JSON) |

## 30-Second Demo

```typescript
import { AitosRuntime, compileAcs, allAtoms } from 'aitos'

const runtime = new AitosRuntime()
allAtoms.forEach(a => runtime.register(a))

// AI generates this graph — using ACS compact syntax
const graph = compileAcs(`
  graph hello {
    let createDiv = createElement(tag: "div", id: "hello")
    let setText = setTextContent(id: "hello", text: "Hello from AI!")
    let setColor = setStyles(id: "hello", styles: { color: "blue", fontSize: "24px" })
    let append = appendChild(parentId: "app", childId: "hello")
  }
`)

await runtime.executeGraph(graph, context)
// → A blue "Hello from AI!" appears on the page
```

AI doesn't need React components, JSX, or build tools — it just composes atoms into a graph, and the runtime executes it.

## Demo Application

**[LinkArm](./linkarm)** — A fully functional AI chat application, built entirely with AITOS atoms. No React, no Vue, no component framework. Every UI element is created by atoms: `createElement`, `setStyles`, `appendChild`, `setTextContent`.

<p align="center">
  <img src="./linkarm/linkarm-1.png" width="45%" alt="LinkArm - Add AI Model">
  <img src="./linkarm/linkarm-2.png" width="45%" alt="LinkArm - Chat Interface">
</p>

## Quick Start

**Prerequisites**: Node.js 18+

### Web Version

```bash
# 1. Clone the repository
git clone https://github.com/hfziqi/aitos.git
cd aitos

# 2. Install dependencies and build packages
cd packages/@aitos/core && npm install && npm run build && cd ../..

# 3. Run demo application
cd linkarm && npm install && npm run dev
```

Open http://localhost:7890 in your browser.

### Windows Desktop Version

**Prerequisites**: Node.js 18+, CMake 3.15+, Visual Studio 2022 (with C++ desktop development workload)

```bash
# 1. Install dependencies and build packages
cd packages/@aitos/core && npm install && npm run build && cd ../..

# 2. Build web frontend
cd linkarm && npm install && npm run build && cd ..

# 3. Extract WebView2 SDK
cd linkarm-desktop
# Extract webview2.zip to current directory (skip if already extracted)

# 4. CMake build
mkdir build && cd build
cmake ..
cmake --build . --config Release

# 5. Run
cd bin/Release
./LinkArm.exe
```

Or use the one-click script (automates steps 1-4):

```bash
cd linkarm && npm run desktop:build
```

**Development mode** (Vite hot reload + desktop window):

```bash
cd linkarm && npm run desktop:dev
```

**What you'll see**: LinkArm - an AI chat application built entirely with AITOS atoms. Add your AI model (OpenAI-compatible API) and start chatting.

## Core Concepts

### Atom — The smallest operation unit

Each atom does one thing. AI can call any atom, or compose multiple atoms into a graph.

```typescript
interface Atom {
  name: string;           // e.g. "createElement", "add", "httpRequest"
  version: string;
  meta: {
    input: Array<{ name: string; type: string; description?: string }>;
    output: { type: string; description?: string };
  };
  execute: (input: any, context: Context) => Promise<Result>;
}
```

### Graph — AI-generated program

A graph defines execution flow using atoms. AI generates graphs, runtime executes them.

**ACS syntax** (compact, AI-friendly):

```
graph chat {
  let getUserInput = getValue(id: "inputBox")
  if getUserInput {
    let callAI = httpStreamRequest(url: "{{apiUrl}}", body: "{{getUserInput}}")
    let showResponse = setTextContent(id: "output", text: "{{callAI.content}}")
  }
}
```

Equivalent JSON (5-10x larger):

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

Use `{{nodeId}}` or `{{nodeId.field}}` to reference another node's output.

## Built-in Atoms (153)

### Core (66 atoms)

| Category | Atoms |
|----------|-------|
| **State** | `get`, `set`, `setGlobal` |
| **Calculation** | `add`, `sub`, `mul`, `div`, `mod`, `random` |
| **Judgment** | `eq`, `gt`, `lt`, `gte`, `lte`, `and`, `or`, `not`, `isNil`, `isNum`, `isStr`, `isArr`, `isObj` |
| **Control** | `branch`, `loop`, `forEach`, `exec`, `execGraph`, `execFile`, `wait`, `log`, `getSkillSet`, `compileAcs`, `executeInContext` |
| **Manipulation** | `concat`, `split`, `len`, `push`, `pop`, `slice`, `getProp`, `setProp`, `keys`, `values`, `merge`, `filter`, `format`, `toNum`, `contains`, `includes`, `startsWith`, `replace`, `trim`, `toLower`, `toUpper`, `getAt`, `join` |
| **Time** | `now`, `timestampToDate`, `getMonthDays`, `isLeapYear` |
| **Tool Calls** | `handleToolCalls` |
| **Telemetry** | `getTelemetryStats`, `resetTelemetry`, `flushTelemetry`, `getTraceLog`, `analyzeTelemetry` |

### Extension Packages (87 atoms)

| Package | Atoms | Description |
|---------|-------|-------------|
| **@aitos/output** | 56 | DOM operations, Canvas 2D, notifications, markdown rendering |
| **@aitos/input** | 7 | Mouse, touch, keyboard, file picker |
| **@aitos/store** | 6 | localStorage, graph management |
| **@aitos/transfer** | 2 | HTTP request, SSE streaming |
| **@aitos/sense** | 5 | Accelerometer, gyroscope, geolocation, battery, network |
| **@aitos/bridge** | 5 | System info, window control (minimize, maximize, close, drag) |
| **@aitos/bridge-desktop** | 6 | Desktop file I/O, command execution, zip reading |

## Architecture

```
┌─────────────────────────────────────────┐
│             Application                 │
│  ┌─────────────────────────────────┐   │
│  │       Graph (ACS / JSON)        │   │
│  │  ┌─────┐     ┌─────┐           │   │
│  │  │Atom1│────→│Atom2│────→ ...  │   │
│  │  └─────┘     └─────┘           │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│           AITOS Runtime                 │
│  ┌──────────┐  ┌──────────────────┐    │
│  │ ACS      │  │ Graph Executor   │    │
│  │ Parser   │  │ + Validator      │    │
│  │ Compiler │  │ + Reference Res. │    │
│  └──────────┘  └──────────────────┘    │
├─────────────────────────────────────────┤
│  Core (66)  │  Extension Packages          │
│  - state     │  - @aitos/input (7)         │
│  - control   │  - @aitos/output (56)       │
│  - judgment  │  - @aitos/store (6)         │
│  - calc      │  - @aitos/transfer (2)      │
│  - manip     │  - @aitos/sense (5)         │
│  - time      │  - @aitos/bridge (5)        │
│  - toolcalls │  - @aitos/bridge-desktop (6)│
│  - telemetry │                              │
└─────────────────────────────────────────┘
```

## Advanced Features

### Growth System (后生图)

Growths are self-evolving programs — AI-generated graphs that can be saved, shared, and reused.

| Mechanism | Description |
|-----------|-------------|
| **`save-growth`** | Saves AI-generated graphs as reusable growths |
| **`list-growths`** | Lists all available growths for reuse |
| **`open-growth`** | Opens and activates a saved growth |
| **`callGrowthTool`** | AI can dynamically invoke any tool-type growth without explicit configuration |

Growths come in two types:
- **`app`** — User-facing UI applications (visible in sidebar)
- **`tool`** — AI-callable functions (visible in the graph market)

### Graph Market (图市场)

A built-in marketplace where users can:
- **Add Model** — Configure AI models (OpenAI-compatible APIs)
- **Import Package** — Import `.zip` packages containing growths (`.acs` files), which are automatically compiled and registered
- **Discover** — Browse available tool-type growths

Every growth imported from the market is immediately available — either in the sidebar (app type) or as an AI callable tool (tool type).

### Bridge Desktop

The `@aitos/bridge` and `@aitos/bridge-desktop` packages enable AI to operate native desktop environments:

- **Window control** — Minimize, maximize, close, drag windows
- **System info** — Query OS, platform, environment
- **File I/O** — Read, write, list, remove local files
- **Command execution** — Run shell commands
- **Zip reading** — Extract and read `.zip` package files

This transforms AITOS from a browser-only runtime to a **desktop operating environment** for AI agents.

## AI Integration

AITOS is designed to work with any LLM that supports function calling:

1. **`getSkillSet`** — Returns all available atoms as a JSON description. Give this to AI as a tool.
2. **`handleToolCalls`** — Processes AI's tool_calls response, executes the requested atoms, and supports dynamic routing to tool-type growths via `callGrowthTool`.
3. **`execGraph`** — AI can generate and execute entire graphs, not just single function calls.

Example flow:
```
User → AI → getSkillSet() → [AI sees all atoms + growth tools]
User → AI → AI generates graph → execGraph(graph) → Result
                              → callGrowthTool(name, args) → Execute pre-saved growth
```

### `callGrowthTool` — AI-callable Growths

Tool-type growths are automatically exposed to AI as callable tools. When the AI needs functionality implemented in a saved growth (e.g., "rain detection algorithm"), the runtime routes the request to the matching growth via `callGrowthTool`, executes it, and returns the result. This allows AI to **reuse pre-composed graphs** instead of generating them from scratch every time.

## Use Cases

- **AI agents that operate UI** — AI directly creates and manipulates DOM elements
- **AI desktop assistants** — AI controls windows, reads files, executes commands
- **AI-driven applications** — Applications whose logic AI can modify at runtime
- **Rapid prototyping** — Build functional UIs with atoms, no framework needed

## License

MIT