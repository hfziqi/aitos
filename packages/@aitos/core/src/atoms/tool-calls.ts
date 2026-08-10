import { Atom, Context, Result } from '../types';
import { compileAcs } from '../acs';

function isGraph(obj: any): boolean {
  return obj && typeof obj === 'object' && Array.isArray(obj.order) && typeof obj.nodes === 'object';
}

function safeStringify(obj: any): string {
  // JSON.stringify returns undefined for undefined/function/symbol — never let
  // a tool result become a non-string (breaks the tool message content contract).
  if (obj === undefined || typeof obj === 'function' || typeof obj === 'symbol') {
    return String(obj);
  }
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

export const handleToolCallsAtom: Atom = {
  name: 'handleToolCalls',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'toolCalls', type: 'array', description: 'Array of tool calls from AI response' }
    ],
    output: { type: 'array', description: '[{ toolCallId: string, name: string, result: string }]' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { toolCalls: any[] }, context: Context): Promise<Result> => {
    if (!input.toolCalls || input.toolCalls.length === 0) {
      return { success: true, data: [] };
    }

    const results: any[] = [];

    for (const toolCall of input.toolCalls) {
      const toolName = toolCall.function?.name;
      let toolArgs: any = {};

      try {
        if (toolCall.function?.arguments) {
          toolArgs = JSON.parse(toolCall.function.arguments);
        }
      } catch (e) {
        results.push({
          toolCallId: toolCall.id,
          name: toolName,
          result: safeStringify({ error: 'Failed to parse arguments' })
        });
        continue;
      }

      let result: any;

      if (toolName === 'getSkillSet') {
        if (context.runtime) {
          // getSkillSet returns a TEXT skill set (header + atom list), not JSON — return it as-is
          result = context.runtime.getSkillSet();
        } else {
          result = { error: 'Runtime not available' };
        }
      } else {
        // Tool name = graph basename → automatic lookup (convention: basename is globally unique).
        // AI can only call tool graphs (type: "tool"); never arbitrary atoms (security whitelist).
        let graphKey: string | undefined;
        for (const key of context.store.keys()) {
          if (!key.startsWith('__graph_')) continue;
          const graph = context.store.get(key);
          if (graph?._meta?.type !== 'tool') continue; // whitelist: only tool-type graphs (background functionality) are AI-callable
          const fullPath = key.slice('__graph_'.length);
          if ((fullPath.split('/').pop() || fullPath) === toolName) {
            graphKey = fullPath;
            break;
          }
        }
        const graphSource = graphKey ? context.store.get(`__graph_${graphKey}`) : undefined;
        if (graphSource && context.executeGraph && context.runtime) {
            const originalGet = context.store.get.bind(context.store);
            const originalSet = context.store.set.bind(context.store);
            try {
              let graph: any;
              if (typeof graphSource === 'string') {
                graph = compileAcs(graphSource);
              } else if (isGraph(graphSource)) {
                graph = graphSource;
              } else {
                result = { error: `Graph "${toolName}" has invalid format` };
                results.push({ toolCallId: toolCall.id, name: toolName, result: safeStringify(result) });
                continue;
              }

              // Injection by declaration (generic mechanism, no per-graph special cases):
              // inputs declared in the graph meta that the AI did not pass but exist in the shared
              // store (system config) → the caller fills them in.
              // e.g. call-model declares input "modelId, task, aiModelsList"; AI passes modelId/task
              //      and aiModelsList is the main conversation's system state (AI cannot see it) → injected from the shared store.
              const declaredInputs: string[] = graph?._meta?.input
                ? String(graph._meta.input).split(',').map((s: string) => s.trim()).filter(Boolean)
                : [];
              const effToolArgs: Record<string, any> = { ...(toolArgs || {}) };
              for (const key of declaredInputs) {
                if (!(key in effToolArgs) && originalGet(key) !== undefined) {
                  effToolArgs[key] = originalGet(key);
                }
              }

              // Isolated execution: the tool graph sees only its effective inputs,
              // system keys (__), session helpers (_), and its own writes. Its
              // internal keys are cleaned up after execution (no shared-store pollution).
              const inputKeys = new Set(Object.keys(effToolArgs));
              const selfSetKeys = new Set<string>();
              const backups = new Map<string, { existed: boolean; value: any }>();
              for (const key of Object.keys(effToolArgs)) {
                backups.set(key, { existed: context.store.has(key), value: originalGet(key) });
              }
              context.store.get = (key: string) => {
                if (inputKeys.has(key) || key.startsWith('__') || key.startsWith('_') || selfSetKeys.has(key)) {
                  return originalGet(key);
                }
                return undefined;
              };
              context.store.set = (key: string, value: any) => {
                selfSetKeys.add(key);
                return originalSet(key, value);
              };

              for (const [key, value] of Object.entries(effToolArgs)) {
                context.store.set(key, value);
              }

              const graphResults = await context.runtime.executeGraph(graph, context, undefined, graphKey);
              result = context.runtime.getGraphOutput(graph, graphResults);

              // Cleanup: restore effective inputs, delete graph-internal keys (no pollution)
              for (const key of selfSetKeys) {
                if (key.startsWith('__')) continue;
                if (backups.has(key)) {
                  const b = backups.get(key)!;
                  if (b.existed) originalSet(key, b.value);
                  else context.store.delete(key);
                } else {
                  context.store.delete(key);
                }
              }
              context.store.get = originalGet;
              context.store.set = originalSet;
            } catch (e: any) {
              result = { error: `Graph execution failed: ${e.message}` };
              context.store.get = originalGet;
              context.store.set = originalSet;
            }
          } else {
            result = { error: `Unknown tool: ${toolName}` };
          }
      }

      results.push({
        toolCallId: toolCall.id,
        name: toolName,
        result: safeStringify(result)
      });
    }

    return { success: true, data: results };
  },
};

// System tool registry: system-reserved capabilities (not graph assets; executed as handleToolCalls special cases).
// Layered with ecosystem graph tools (type: "tool" graphs, auto-collected) — system capabilities are fixed, ecosystem capabilities are automatic.
const SYSTEM_TOOLS: any[] = [
  {
    type: 'function',
    function: {
      name: 'getSkillSet',
      description: 'Get all available atoms, graph format, and validation rules',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  }
];

// Auto-collect tool configs from all registered tool-type graphs (meta.type === "tool").
// Convention: a graph's tool name = its path basename (e.g. growth/save-growth → "save-growth").
// Single shared tool list for all models (main and sub) — no per-role manual configs.
export const collectToolsAtom: Atom = {
  name: 'collectTools',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'array', description: 'Array of tool configs (system tools + all tool-type graphs; name = graph basename)' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (_input: any, context: Context): Promise<Result> => {
    // system tools (registry, fixed) + graph tools (auto-collected)
    const tools: any[] = [...SYSTEM_TOOLS];
    for (const key of context.store.keys()) {
      if (!key.startsWith('__graph_')) continue;
      const graph = context.store.get(key);
      const meta = graph?._meta;
      if (!meta || meta.type !== 'tool') continue;
      const fullPath = key.slice('__graph_'.length);
      const basename = fullPath.split('/').pop() || fullPath;
      const params = String(meta.input || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const properties: Record<string, any> = {};
      for (const p of params) properties[p] = { type: 'string' };
      tools.push({
        type: 'function',
        function: {
          name: basename,
          description: meta.description || '',
          parameters: { type: 'object', properties, required: params }
        }
      });
    }
    return { success: true, data: tools };
  },
};
