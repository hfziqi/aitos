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
      { name: 'then', type: 'object', description: 'Graph to execute if cond is true' },
      { name: 'else', type: 'object', description: 'Graph to execute if cond is false' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { cond: boolean; then?: Graph; else?: Graph }, context: Context): Promise<Result> => {
    const condValue = !!input.cond;
    
    const branchInput = condValue ? input.then : input.else;
    
    if (!branchInput) {
      return { success: true, data: null };
    }

    if (!isGraph(branchInput)) {
      return { success: false, error: 'Branch input must be a valid graph with order and nodes' };
    }

    if (!context.executeGraph) {
      return { success: false, error: 'executeGraph not available' };
    }

    const results = await context.executeGraph(branchInput, context.currentScope);
    const lastNodeId = branchInput.order[branchInput.order.length - 1];
    return { success: true, data: results[lastNodeId] };
  },
};

export const loopAtom: Atom = {
  name: 'loop',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'nodes', type: 'object' },
      { name: 'condKey', type: 'string' }
    ],
    output: { type: 'void' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
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

      await context.executeGraph(nodes, context.currentScope);
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
  characteristics: { stateless: true, atomic: true, composable: true },
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
      await context.executeGraph(input.nodes, context.currentScope);
    }

    return { success: true, data: { done: true } };
  },
};

export const execAtom: Atom = {
  name: 'exec',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'nodes', type: 'object' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { nodes: Graph }, context: Context): Promise<Result> => {
    if (!context.executeGraph) {
      return { success: true, data: null };
    }

    const results = await context.executeGraph(input.nodes, context.currentScope);
    const lastNodeId = input.nodes.order[input.nodes.order.length - 1];
    return { success: true, data: results[lastNodeId] };
  },
};

export const execGraphAtom: Atom = {
  name: 'execGraph',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'graph', type: 'any', description: 'Graph object or ACS string' }
    ],
    output: { type: 'any', description: 'Result of the last node in the graph' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { graph: any }, context: Context): Promise<Result> => {
    if (!context.executeGraph) {
      return { success: false, error: 'executeGraph not available in context' };
    }

    let graph: Graph;
    if (typeof input.graph === 'string') {
      try {
        graph = compileAcs(input.graph);
      } catch (e: any) {
        return { success: false, error: `Failed to compile ACS: ${e.message}` };
      }
    } else if (isGraph(input.graph)) {
      graph = input.graph;
    } else {
      return { success: false, error: 'Invalid graph: must be a Graph object or ACS string' };
    }

    if (!graph.order || !graph.nodes) {
      return { success: false, error: 'Invalid graph: missing order or nodes' };
    }

    const results = await context.executeGraph(graph, context.currentScope);
    const lastNodeId = graph.order[graph.order.length - 1];
    return { success: true, data: results[lastNodeId] };
  },
};

export const waitAtom: Atom = {
  name: 'wait',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'ms', type: 'number' }
    ],
    output: { type: 'void' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { ms: number }, context: Context): Promise<Result> => {
    return new Promise(resolve => {
      setTimeout(() => resolve({ success: true, data: { done: true } }), input.ms);
    });
  },
};

export const execFileAtom: Atom = {
  name: 'execFile',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'file', type: 'string' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { file: string }, context: Context): Promise<Result> => {
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

    const results = await context.executeGraph(graph, context.currentScope, input.file);
    const lastNodeId = graph.order[graph.order.length - 1];
    return { success: true, data: results[lastNodeId] };
  },
};

export const logAtom: Atom = {
  name: 'log',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'message', type: 'string' },
      { name: 'data', type: 'any' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
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
  characteristics: { stateless: true, atomic: true, composable: true },
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
    output: { type: 'object', description: 'Compiled Graph object or error' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
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
  characteristics: { stateless: true, atomic: true, composable: true },
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


