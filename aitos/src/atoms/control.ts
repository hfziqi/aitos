import { Atom, Context, Result, Graph } from '../types';

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
      { name: 'graph', type: 'object', description: 'Complete graph with order and nodes' }
    ],
    output: { type: 'any', description: 'Result of the last node in the graph' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { graph: Graph }, context: Context): Promise<Result> => {
    if (!context.executeGraph) {
      return { success: false, error: 'executeGraph not available in context' };
    }

    if (!input.graph || !input.graph.order || !input.graph.nodes) {
      return { success: false, error: 'Invalid graph: missing order or nodes' };
    }

    const results = await context.executeGraph(input.graph, context.currentScope);
    const lastNodeId = input.graph.order[input.graph.order.length - 1];
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
  version: '1.1.0',
  meta: {
    input: [
      { name: 'file', type: 'string' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { file: string }, context: Context): Promise<Result> => {
    const graph = context.store.get(`__graph_${input.file}`);
    
    if (!graph) {
      return { success: false, error: `Graph file "${input.file}" not found in store` };
    }
    
    if (!context.executeGraph) {
      return { success: false, error: 'executeGraph not available in context' };
    }

    const results = await context.executeGraph(graph, context.currentScope);
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
