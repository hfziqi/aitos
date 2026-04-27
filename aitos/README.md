# aitos

AI Agent execution runtime — 37 built-in atoms + ACS compact syntax + graph engine.

## Installation

```bash
npm install aitos
```

## Quick Start

```typescript
import { AitosRuntime, compileAcs, allAtoms } from 'aitos'

const runtime = new AitosRuntime()
allAtoms.forEach(atom => runtime.register(atom))

// Define a graph using ACS compact syntax
const graph = compileAcs(`
  graph counter {
    let getValue = get(key: "counter")
    let addOne = add(a: "{{getValue}}", b: 1)
    let save = set(key: "counter", value: "{{addOne}}")
  }
`)

// Create context
const store = new Map([['counter', 0]])
const context = {
  store: {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    has: (key) => store.has(key),
    delete: (key) => store.delete(key),
    clear: () => store.clear(),
    keys: () => store.keys()
  },
  currentScope: {},
  execute: async (atomName, input) => {
    const atom = runtime.listAtoms().find(a => a.name === atomName)
    return atom.execute(input, context)
  }
}

await runtime.executeGraph(graph, context)
// counter is now 1
```

## Core Concepts

### Atom

The smallest operation unit. Each atom does one thing.

```typescript
interface Atom {
  name: string;
  version: string;
  meta: {
    input: Array<{ name: string; type: string; description?: string }>;
    output: { type: string; description?: string };
  };
  characteristics: { stateless: boolean; atomic: boolean; composable: boolean };
  execute: (input: any, context: Context) => Promise<Result>;
}
```

### Graph

A graph defines execution flow. AI generates graphs, runtime executes them.

Use **ACS syntax** (compact, AI-friendly):

```
graph example {
  let getValue = get(key: "counter")
  let addOne = add(a: "{{getValue}}", b: 1)
  let save = set(key: "counter", value: "{{addOne}}")
}
```

Or **JSON format** (equivalent, but 5-10x larger):

```json
{
  "order": ["getValue", "addOne", "save"],
  "nodes": {
    "getValue": { "atom": "get", "key": "counter" },
    "addOne": { "atom": "add", "a": "{{getValue}}", "b": 1 },
    "save": { "atom": "set", "key": "counter", "value": "{{addOne}}" }
  }
}
```

Use `{{nodeId}}` or `{{nodeId.field}}` to reference another node's output.

### ACS Syntax

```
graph <name> {
  [mode: kernel|user]
  [budget: { maxSteps: N, maxDepth: N, timeoutMs: N }]

  let <id> = <atom>(<param>: <value>, ...)
  if <refNodeId> { <nodes...> } [else { <nodes...> }]
  loop [max: N] [cond: <storeKey>] { <nodes...> }
  forEach <item> in <arrayRef> { <nodes...> }
}
```

## Built-in Atoms (37)

| Category | Atoms |
|----------|-------|
| **State** | `get`, `set` |
| **Calculation** | `add`, `sub`, `mul`, `div`, `mod`, `random` |
| **Judgment** | `eq`, `gt`, `lt`, `gte`, `lte`, `and`, `or`, `not`, `isNil`, `isNum`, `isStr`, `isArr`, `isObj` |
| **Control** | `branch`, `loop`, `forEach`, `exec`, `execGraph`, `execFile`, `wait`, `log`, `getSkillSet` |
| **Manipulation** | `concat`, `split`, `len`, `push`, `pop`, `slice`, `getProp`, `setProp`, `keys`, `values`, `merge`, `filter`, `format` |
| **Time** | `timestampToDate`, `getMonthDays`, `isLeapYear` |
| **Tool Calls** | `handleToolCalls`, `listTools`, `registerTool`, `executeTool` |

## AI Integration

- **`getSkillSet()`** — Returns all available atoms as JSON. Give this to AI as a tool.
- **`handleToolCalls()`** — Processes AI's tool_calls, executes the requested atoms.
- **`execGraph()`** — AI can generate and execute entire graphs.

## License

MIT
