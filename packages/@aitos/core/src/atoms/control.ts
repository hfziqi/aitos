import { Atom, Context, Result, Graph } from '../types';
import { compileAcs } from '../acs';

function isGraph(obj: any): obj is Graph {
  return obj && typeof obj === 'object' && Array.isArray(obj.order) && typeof obj.nodes === 'object';
}

export const branchAtom: Atom = {
  name: 'branch',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'cond', type: 'boolean', description: 'Condition to evaluate' },
      { name: 'then', type: 'any', description: 'Value returned (or graph executed) if cond is true' },
      { name: 'else', type: 'any', description: 'Value returned (or graph executed) if cond is false' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { cond: boolean; then?: Graph; else?: Graph }, context: Context): Promise<Result> => {
    const condValue = !!input.cond;
    
    const branchInput = condValue ? input.then : input.else;
    
    if (!branchInput) {
      return { success: true, data: null };
    }

    // Value then/else (AI's intuitive form: branch(cond, then: "x", else: "y")) → return the value directly.
    // Graph then/else (compiled from `if cond { ... } else { ... }`) → execute the sub-graph below.
    if (!isGraph(branchInput)) {
      return { success: true, data: branchInput };
    }

    if (!context.executeGraph) {
      return { success: false, error: 'executeGraph not available' };
    }

    const results = await context.executeGraph(branchInput, (input as any).__scope ?? context.currentScope);
    const lastNodeId = branchInput.order[branchInput.order.length - 1];
    return { success: true, data: results[lastNodeId] };
  },
};

export const loopAtom: Atom = {
  name: 'loop',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'nodes', type: 'object', description: 'Graph body to execute repeatedly' },
      { name: 'condKey', type: 'string', description: 'Store key that must be truthy to continue the loop' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { nodes: Graph; condKey?: string }, context: Context): Promise<Result> => {
    const { nodes, condKey } = input;

    if (!context.executeGraph) {
      return { success: true, data: { done: true } };
    }

    while (true) {
      if (condKey) {
        const shouldContinue = context.store.get(condKey);
        if (!shouldContinue) break;
      }

      await context.executeGraph(nodes, (input as any).__scope ?? context.currentScope);
    }

    return { success: true, data: { done: true } };
  },
};

export const forEachAtom: Atom = {
  name: 'forEach',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array', description: 'Array to iterate' },
      { name: 'nodes', type: 'object', description: 'Graph to execute for each item' },
      { name: 'itemKey', type: 'string', description: 'Key to store current item in store' },
      { name: 'indexKey', type: 'string', description: 'Optional key to store current index' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { 
    array: any[]; 
    nodes: Graph; 
    itemKey: string;
    indexKey?: string;
  }, context: Context): Promise<Result> => {
    if (!context.executeGraph) {
      return { success: true, data: { done: true } };
    }

    if (!Array.isArray(input.array)) {
      return { success: false, error: 'Input is not an array' };
    }

    for (let i = 0; i < input.array.length; i++) {
      context.store.set(input.itemKey, input.array[i]);
      if (input.indexKey) {
        context.store.set(input.indexKey, i);
      }
      await context.executeGraph(input.nodes, (input as any).__scope ?? context.currentScope);
    }

    return { success: true, data: { done: true } };
  },
};

export const execAtom: Atom = {
  name: 'exec',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'nodes', type: 'object', description: 'Graph body to execute once' }
    ],
    output: { type: 'any', description: 'Result of the last node' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { nodes: Graph }, context: Context): Promise<Result> => {
    if (!context.executeGraph) {
      return { success: true, data: null };
    }

    const results = await context.executeGraph(input.nodes, (input as any).__scope ?? context.currentScope);
    const lastNodeId = input.nodes.order[input.nodes.order.length - 1];
    return { success: true, data: results[lastNodeId] };
  },
};

export const waitAtom: Atom = {
  name: 'wait',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'ms', type: 'number', description: 'Milliseconds to wait' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { ms: number }, context: Context): Promise<Result> => {
    return new Promise(resolve => {
      setTimeout(() => resolve({ success: true, data: { done: true } }), input.ms);
    });
  },
};

export const execFileAtom: Atom = {
  name: 'execFile',
  version: '1.2.0',
  meta: {
    input: [
      { name: 'file', type: 'string', description: 'Graph file path, e.g. "growth-name/handle-xxx"' },
      { name: 'store', type: 'object', description: 'Key-value pairs to inject into the target graph store (optional)' },
      { name: 'isolated', type: 'boolean', description: 'If true, target graph can only read keys passed via store + system keys (optional, default false)' }
    ],
    output: { type: 'any', description: 'Output of the executed graph' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { file: string; store?: Record<string, any>; isolated?: boolean }, context: Context): Promise<Result> => {
    let graph = context.store.get(`__graph_${input.file}`);
    
    if (!graph) {
      return { success: false, error: `Graph file "${input.file}" not found in store` };
    }
    
    if (typeof graph === 'string') {
      try {
        graph = compileAcs(graph);
      } catch (e: any) {
        return { success: false, error: `Failed to compile ACS: ${e.message}` };
      }
    }

    if (!isGraph(graph)) {
      return { success: false, error: 'Invalid graph: must be a Graph object or ACS string' };
    }
    
    if (!context.executeGraph) {
      return { success: false, error: 'executeGraph not available in context' };
    }

    // Validate: business params passed by the caller must be declared in the target graph's meta.input.
    // This catches graphs that forgot to declare input (interface incomplete) — omission is only safe
    // because undeclared params are surfaced here instead of silently mismatching. __/_ prefixed keys
    // are system/session helpers — skipped.
    const declaredInputs = String((graph as any)?._meta?.input || '')
      .split(',').map((s: string) => s.trim()).filter(Boolean);
    for (const key of Object.keys(input.store || {})) {
      if (key.startsWith('__') || key.startsWith('_')) continue;
      if (!declaredInputs.includes(key)) {
        return { success: false, error: `Parameter "${key}" passed to "${input.file}" is not declared in its meta.input — the graph forgot to declare input, or the caller passed an undeclared parameter` };
      }
    }

    // Inject store parameters into the target graph's store before execution
    if (input.store) {
      for (const [key, value] of Object.entries(input.store)) {
        context.store.set(key, value);
      }
    }

    // isolated mode: target graph can read store params + system keys (__ prefix) + session helpers (_ prefix) + keys it sets itself
    let restoreStore: (() => void) | null = null;
    if (input.isolated) {
      const originalGet = context.store.get.bind(context.store);
      const originalSet = context.store.set.bind(context.store);
      const allowedKeys = new Set(Object.keys(input.store || {}));
      const selfSetKeys = new Set<string>();
      context.store.get = (key: string) => {
        if (allowedKeys.has(key) || key.startsWith('__') || key.startsWith('_') || selfSetKeys.has(key)) return originalGet(key);
        return undefined;
      };
      context.store.set = (key: string, value: any) => {
        selfSetKeys.add(key);
        return originalSet(key, value);
      };
      restoreStore = () => {
        context.store.get = originalGet;
        context.store.set = originalSet;
      };
    }

    try {
      const results = await context.executeGraph(graph, (input as any).__scope ?? context.currentScope, input.file);
      const output = context.runtime!.getGraphOutput(graph, results);
      return { success: true, data: output };
    } finally {
      if (restoreStore) restoreStore();
    }
  },
};

export const logAtom: Atom = {
  name: 'log',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'message', type: 'string', description: 'Log message' },
      { name: 'data', type: 'any', description: 'Optional data to log alongside the message' }
    ],
    output: { type: 'any', description: 'Passes through the input data' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { message?: string; data?: any }, context: Context): Promise<Result> => {
    if (input.message && input.data !== undefined) {
      console.log(`[AITOS] ${input.message}:`, input.data);
    } else if (input.data !== undefined) {
      console.log('[AITOS]', input.data);
    } else if (input.message) {
      console.log(`[AITOS] ${input.message}`);
    }
    return { success: true, data: input.data };
  },
};

export const getSkillSetAtom: Atom = {
  name: 'getSkillSet',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'string', description: 'JSON string containing all available atoms and graph format' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    if (!context.runtime) {
      return { success: false, error: 'Runtime not available in context' };
    }
    
    const skillSet = context.runtime.getSkillSet();
    return { success: true, data: skillSet };
  },
};

export const compileAcsAtom: Atom = {
  name: 'compileAcs',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'acs', type: 'string', description: 'ACS string to compile' }
    ],
    output: { type: 'object', description: 'Compiled graph { order: string[], nodes: object, _meta: { type, icon, description } } or { __error: string } on failure' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { acs: string }, context: Context): Promise<Result> => {
    if (typeof input.acs !== 'string') {
      return { success: false, error: 'Input must be a string' };
    }

    try {
      const graph = compileAcs(input.acs);

      if (context.runtime) {
        const validation = context.runtime.validateGraph(graph);
        if (!validation.valid) {
          return { success: false, error: `Graph validation failed: ${validation.errors.join('; ')}` };
        }
      }

      return { success: true, data: graph };
    } catch (e: any) {
      return { success: false, error: `ACS compilation error: ${e.message}` };
    }
  },
};

export const executeInContextAtom: Atom = {
  name: 'executeInContext',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'contextKey', type: 'string', description: 'Store key of the target Context to execute in' },
      { name: 'graphKey', type: 'string', description: 'Store key of the Graph to execute' },
      { name: 'store', type: 'object', description: 'Optional data to pre-load into target Context before execution' },
      { name: 'scope', type: 'object', description: 'Optional outer scope to pass to the graph' }
    ],
    output: { type: 'any', description: 'Result of the last node in the executed graph' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { 
    contextKey: string; 
    graphKey: string; 
    store?: Record<string, any>;
    scope?: Record<string, any>;
  }, context: Context): Promise<Result> => {
    const targetCtx: Context | undefined = context.store.get(input.contextKey);
    if (!targetCtx || typeof targetCtx.executeGraph !== 'function') {
      return { success: false, error: `Target context not found at key "${input.contextKey}"` };
    }

    let graph = context.store.get(input.graphKey);
    if (!graph) {
      graph = targetCtx.store.get(input.graphKey);
    }
    if (!graph) {
      return { success: false, error: `Graph not found at key "${input.graphKey}"` };
    }

    if (typeof graph === 'string') {
      try {
        graph = compileAcs(graph);
      } catch (e: any) {
        return { success: false, error: `Failed to compile ACS: ${e.message}` };
      }
    }

    if (!isGraph(graph)) {
      return { success: false, error: 'Invalid graph: must be a Graph object or ACS string' };
    }

    if (input.store) {
      for (const [k, v] of Object.entries(input.store)) {
        targetCtx.store.set(k, v);
      }
    }

    const srcChainId = context.store.get('__traceChainId');
    if (srcChainId) {
      targetCtx.store.set('__traceChainId', srcChainId);
    }

    const results = await targetCtx.executeGraph(graph, input.scope || targetCtx.currentScope);
    const lastNodeId = graph.order[graph.order.length - 1];
    return { success: true, data: results[lastNodeId] };
  },
};

export const setIntervalAtom: Atom = {
  name: 'setInterval',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'ms', type: 'number', description: 'Interval in milliseconds' },
      { name: 'graph', type: 'string', description: 'Graph file path to execute periodically' }
    ],
    output: { type: 'object', description: '{ timerId: number }' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { ms: number; graph: string }, context: Context): Promise<Result> => {
    const timerId = setInterval(async () => {
      let graph = context.store.get(`__graph_${input.graph}`);
      if (typeof graph === 'string') {
        try { graph = compileAcs(graph); } catch { return; }
      }
      if (graph && context.executeGraph) {
        await context.executeGraph(graph, context.currentScope, input.graph);
      }
    }, input.ms);
    return { success: true, data: { timerId } };
  },
};

