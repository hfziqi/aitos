import { Atom, Context, Result, Graph } from '../types';

export const concatAtom: Atom = {
  name: 'concat',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'any' },
      { name: 'b', type: 'any' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: any; b: any }, context: Context): Promise<Result> => {
    if (Array.isArray(input.a) && Array.isArray(input.b)) {
      return { success: true, data: [...input.a, ...input.b] };
    }
    return { success: true, data: String(input.a) + String(input.b) };
  },
};

export const splitAtom: Atom = {
  name: 'split',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string' },
      { name: 'separator', type: 'string' }
    ],
    output: { type: 'array' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string; separator: string }, context: Context): Promise<Result> => {
    return { success: true, data: input.text.split(input.separator) };
  },
};

export const lenAtom: Atom = {
  name: 'len',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any' }
    ],
    output: { type: 'number' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: string | any[] | null | undefined }, context: Context): Promise<Result> => {
    if (input.value === null || input.value === undefined) {
      return { success: true, data: 0 };
    }
    return { success: true, data: input.value.length };
  },
};

export const pushAtom: Atom = {
  name: 'push',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array' },
      { name: 'value', type: 'any' }
    ],
    output: { type: 'array' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { array: any[]; value: any }, context: Context): Promise<Result> => {
    const arr = [...input.array, input.value];
    return { success: true, data: arr };
  },
};

export const popAtom: Atom = {
  name: 'pop',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { array: any[] }, context: Context): Promise<Result> => {
    const arr = [...input.array];
    const value = arr.pop();
    return { success: true, data: value };
  },
};

export const sliceAtom: Atom = {
  name: 'slice',
  version: '1.1.0',
  meta: {
    input: [
      { name: 'array', type: 'array|string' },
      { name: 'start', type: 'number' },
      { name: 'end', type: 'number' }
    ],
    output: { type: 'array|string' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { array: any[] | string; start: number; end?: number }, context: Context): Promise<Result> => {
    if (typeof input.array === 'string') {
      return { success: true, data: input.array.slice(input.start, input.end) };
    }
    return { success: true, data: input.array.slice(input.start, input.end) };
  },
};

export const getPropAtom: Atom = {
  name: 'getProp',
  version: '1.0.1',
  meta: {
    input: [
      { name: 'obj', type: 'object' },
      { name: 'key', type: 'any' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { obj: any; key: string | number }, context: Context): Promise<Result> => {
    return { success: true, data: input.obj?.[input.key] ?? null };
  },
};

export const setPropAtom: Atom = {
  name: 'setProp',
  version: '1.0.1',
  meta: {
    input: [
      { name: 'obj', type: 'object' },
      { name: 'key', type: 'any' },
      { name: 'value', type: 'any' }
    ],
    output: { type: 'any' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { obj: any; key: string | number; value: any }, context: Context): Promise<Result> => {
    if (Array.isArray(input.obj)) {
      const arr = [...input.obj];
      arr[Number(input.key)] = input.value;
      return { success: true, data: arr };
    } else {
      const obj = { ...input.obj };
      obj[input.key] = input.value;
      return { success: true, data: obj };
    }
  },
};

export const keysAtom: Atom = {
  name: 'keys',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'obj', type: 'object' }
    ],
    output: { type: 'array' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { obj: any }, context: Context): Promise<Result> => {
    return { success: true, data: Object.keys(input.obj || {}) };
  },
};

export const valuesAtom: Atom = {
  name: 'values',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'obj', type: 'object' }
    ],
    output: { type: 'array' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { obj: any }, context: Context): Promise<Result> => {
    return { success: true, data: Object.values(input.obj || {}) };
  },
};

export const mergeAtom: Atom = {
  name: 'merge',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'object' },
      { name: 'b', type: 'object' }
    ],
    output: { type: 'object' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: any; b: any }, context: Context): Promise<Result> => {
    return { success: true, data: { ...input.a, ...input.b } };
  },
};

export const filterAtom: Atom = {
  name: 'filter',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array', description: 'Array to filter' },
      { name: 'nodes', type: 'object', description: 'Graph to execute for each item, should return boolean' },
      { name: 'itemKey', type: 'string', description: 'Key to store current item in store' },
      { name: 'indexKey', type: 'string', description: 'Optional key to store current index' }
    ],
    output: { type: 'array', description: 'Filtered array' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { 
    array: any[]; 
    nodes: Graph; 
    itemKey: string;
    indexKey?: string;
  }, context: Context): Promise<Result> => {
    if (!context.executeGraph) {
      return { success: true, data: [] };
    }

    if (!Array.isArray(input.array)) {
      return { success: false, error: 'Input is not an array' };
    }

    const result: any[] = [];
    
    for (let i = 0; i < input.array.length; i++) {
      context.store.set(input.itemKey, input.array[i]);
      if (input.indexKey) {
        context.store.set(input.indexKey, i);
      }
      
      const results = await context.executeGraph(input.nodes, context.currentScope);
      const lastNodeId = input.nodes.order[input.nodes.order.length - 1];
      const shouldKeep = results[lastNodeId];
      
      if (shouldKeep === true) {
        result.push(input.array[i]);
      }
    }
    
    return { success: true, data: result };
  },
};

export const formatAtom: Atom = {
  name: 'format',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'template', type: 'string', description: 'Template string with {placeholder} syntax' }
    ],
    output: { type: 'string', description: 'Formatted string with placeholders replaced' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { template: string; [key: string]: any }, context: Context): Promise<Result> => {
    let result = input.template;
    
    for (const [key, value] of Object.entries(input)) {
      if (key === 'template') continue;
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }
    
    return { success: true, data: result };
  },
};
