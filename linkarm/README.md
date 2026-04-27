# LinkArm

LinkArm is an AI chat application built with AITOS atomic architecture framework.

## Why AITOS?

### Design Philosophy

Traditional code is written for humans. AITOS is designed for both humans and AI.

| Traditional Code | AITOS Graph |
|------------------|-------------|
| `.ts/.js` files | JSON files |
| Functions/Classes | Atoms (composable units) |
| Hard for AI to modify | Easy for AI to generate/modify |
| Imperative | Declarative |

### Key Benefits

1. **AI-Friendly**: AI can read, understand, and modify JSON graphs
2. **Composable**: Small atoms combine into complex applications
3. **Transparent**: All logic is visible in JSON format
4. **No Build Step**: Graphs execute directly at runtime

### Use Cases

- AI-driven applications
- Rapid prototyping
- Educational projects
- Systems that need AI to modify their own logic

## What is AITOS?

AITOS is an AI-friendly atomic architecture framework that allows you to build applications using composable "atoms" - small, reusable units of functionality.

## Prerequisites

- Node.js 18+
- npm or yarn

## Getting Started

### 1. Build AITOS Core Package

```bash
cd aitos
npm install
npm run build
```

### 2. Build AITOS Extension Packages

```bash
# Input package
cd packages/@aitos/input
npm install
npm run build

# Output package
cd ../output
npm install
npm run build

# Store package
cd ../store
npm install
npm run build

# Transfer package
cd ../transfer
npm install
npm run build

# Sense package
cd ../sense
npm install
npm run build
```

### 3. Run LinkArm

```bash
cd linkarm
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Features

- AI Chat Interface
- Multiple AI Model Support
- Conversation Management
- Modern UI built with AITOS atoms

## Architecture

LinkArm demonstrates the power of AITOS atomic architecture:

- **Graphs**: JSON-defined workflows that orchestrate atoms
- **Atoms**: Small, reusable units of functionality
- **Runtime**: Executes graphs and manages state

## Project Structure

```
linkarm/
├── src/
│   ├── graphs/                    # JSON Graph Files (Application Logic)
│   │   ├── core/                  # Core functionality
│   │   │   ├── main.json          # Application initialization
│   │   │   ├── render.json        # UI rendering coordinator
│   │   │   ├── load-*.json        # Data loading (conversations, models, etc.)
│   │   │   └── save-*.json        # Data saving
│   │   │
│   │   ├── actions/               # User actions
│   │   │   ├── newChat.json       # Create new conversation
│   │   │   ├── send-message.json  # Send chat message
│   │   │   └── openAI.json        # Open AI model market
│   │   │
│   │   ├── ui/                    # User Interface
│   │   │   ├── layout/            # Layout components
│   │   │   │   ├── sidebar/       # Left sidebar (conversation list)
│   │   │   │   ├── toolbar/       # Left toolbar (navigation buttons)
│   │   │   │   ├── main-view/     # Main content area
│   │   │   │   └── top-bar/       # Top bar
│   │   │   ├── views/             # Page views
│   │   │   │   ├── chat/          # Chat view
│   │   │   │   └── market/        # AI models market view
│   │   │   └── components/        # Reusable components
│   │   │       ├── chat-input/    # Message input area
│   │   │       ├── message-list/  # Message display list
│   │   │       └── model-card/    # AI model card
│   │   │
│   │   ├── services/              # External services
│   │   │   └── ai/                # AI service integration
│   │   │       └── chat-loop.json # AI conversation loop
│   │   │
│   │   ├── domain/                # Domain logic
│   │   │   ├── conversation/      # Conversation operations
│   │   │   └── message/           # Message operations
│   │   │
│   │   └── styles/                # Global styles
│   │       └── global.json        # Global CSS injection
│   │
│   ├── runtime.ts                 # Runtime configuration (register atoms)
│   ├── context.ts                 # Context management
│   └── main.ts                    # Application entry point
│
├── index.html                     # HTML template
├── vite.config.ts                 # Vite configuration
└── package.json                   # Package configuration
```

## Core Concepts

### Graph (JSON Workflow)

A Graph is a JSON file that defines a workflow. It consists of:

```json
{
  "order": ["step1", "step2", "step3"],  // Execution order
  "nodes": {
    "step1": { "atom": "get", "key": "data" },
    "step2": { "atom": "set", "key": "result", "value": "{{step1}}" },
    "step3": { "atom": "execFile", "file": "path/to/another/graph" }
  }
}
```

- **order**: Array of node names defining execution sequence
- **nodes**: Object containing node definitions
- **{{nodeName}}**: Reference to another node's output

### Atom (Functional Unit)

Atoms are the smallest units of functionality. Examples:

| Atom | Description | Example |
|------|-------------|---------|
| `get` / `set` | State management | `{"atom": "get", "key": "conversations"}` |
| `createElement` | Create DOM element | `{"atom": "createElement", "tag": "div", "id": "container"}` |
| `appendChild` | Add child element | `{"atom": "appendChild", "parentId": "body", "childId": "container"}` |
| `setStyles` | Apply CSS styles | `{"atom": "setStyles", "id": "container", "styles": {...}}` |
| `execFile` | Execute another graph | `{"atom": "execFile", "file": "ui/views/chat/create"}` |
| `branch` | Conditional logic | `{"atom": "branch", "cond": "{{condition}}", "then": {...}, "else": {...}}` |
| `forEach` | Loop over array | `{"atom": "forEach", "array": "{{items}}", ...}` |
| `getItem` / `setItem` | localStorage | `{"atom": "getItem", "key": "models/ai-models"}` |

### Runtime

The runtime executes graphs and manages state:

```typescript
// runtime.ts
import { AitosRuntime, Atom } from 'aitos'
import { allAtoms as storeAtoms } from '@aitos/store'

const runtime = new AitosRuntime()
allAtoms.forEach(atom => runtime.register(atom))
```

## How to Modify

### Adding a New Feature

1. Create a new JSON file in the appropriate directory
2. Define the `order` and `nodes`
3. Use `execFile` to call it from other graphs

### Modifying UI

1. Find the component in `src/graphs/ui/`
2. Modify the `create.json` for structure
3. Modify the `styles.json` for appearance

### Changing Data Storage

1. Find `load-*.json` or `save-*.json` in `src/graphs/core/`
2. Modify the `getItem`/`setItem` keys

## Data Storage

LinkArm uses browser localStorage for data persistence:

| Key | Description |
|-----|-------------|
| `chat/conversations` | Conversation list |
| `chat/messages/{id}` | Messages for each conversation |
| `models/ai-models` | AI model configurations |
| `models/active-model-id` | Currently selected model |

## License

MIT
