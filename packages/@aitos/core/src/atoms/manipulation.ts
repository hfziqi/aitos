import { Atom, Context, Result, Graph } from '../types';

export const concatAtom: Atom = {
  name: 'concat',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'any', description: 'First value or array' },
      { name: 'b', type: 'any', description: 'Second value or array' }
    ],
    output: { type: 'any', description: 'Concatenated string or array' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: any; b: any }, context: Context): Promise<Result> => {
    if (Array.isArray(input.a) && Array.isArray(input.b)) {
      return { success: true, data: [...input.a, ...input.b] };
    }
    return { success: true, data: String(input.a) + String(input.b) };
  },
};

export const rangeAtom: Atom = {
  name: 'range',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'start', type: 'number', description: 'Start of range (inclusive)' },
      { name: 'end', type: 'number', description: 'End of range (exclusive)' },
      { name: 'step', type: 'number', description: 'Step between values (optional, default 1)' }
    ],
    output: { type: 'array', description: 'Array of numbers from start to end' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { start: number; end: number; step?: number }, context: Context): Promise<Result> => {
    const step = input.step ?? 1;
    const arr: number[] = [];
    if (step === 0) return { success: true, data: arr };
    if (step > 0) {
      for (let i = input.start; i < input.end; i += step) arr.push(i);
    } else {
      for (let i = input.start; i > input.end; i += step) arr.push(i);
    }
    return { success: true, data: arr };
  },
};

export const splitAtom: Atom = {
  name: 'split',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'Text to split' },
      { name: 'separator', type: 'string', description: 'Separator string' }
    ],
    output: { type: 'array', description: 'Array of split parts' }
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
      { name: 'value', type: 'any', description: 'String or array to measure' }
    ],
    output: { type: 'number', description: 'Length of the value (0 if null/undefined)' }
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
      { name: 'array', type: 'array', description: 'Array to append to' },
      { name: 'value', type: 'any', description: 'Value to append' }
    ],
    output: { type: 'array', description: 'New array with the value appended' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
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
      { name: 'array', type: 'array', description: 'Array to pop from' }
    ],
    output: { type: 'any', description: 'Last element removed from the array' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { array: any[] }, context: Context): Promise<Result> => {
    const arr = [...input.array];
    const value = arr.pop();
    return { success: true, data: value };
  },
};

export const sliceAtom: Atom = {
  name: 'slice',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array|string', description: 'Array or string to slice' },
      { name: 'start', type: 'number', description: 'Start index (negative = from end)' },
      { name: 'end', type: 'number', description: 'End index (exclusive, optional)' }
    ],
    output: { type: 'array|string', description: 'Sliced portion' }
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
  version: '1.0.0',
  meta: {
    input: [
      { name: 'obj', type: 'object', description: 'Object to read from' },
      { name: 'key', type: 'any', description: 'Property key to get' }
    ],
    output: { type: 'any', description: 'Property value (null if missing)' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { obj: any; key: string | number }, context: Context): Promise<Result> => {
    return { success: true, data: input.obj?.[input.key] ?? null };
  },
};

export const setPropAtom: Atom = {
  name: 'setProp',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'obj', type: 'object', description: 'Object or array to modify' },
      { name: 'key', type: 'any', description: 'Property key to set' },
      { name: 'value', type: 'any', description: 'Value to set' }
    ],
    output: { type: 'any', description: 'New object/array with the property set' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
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
      { name: 'obj', type: 'object', description: 'Object to get keys from' }
    ],
    output: { type: 'array', description: 'Array of property keys' }
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
      { name: 'obj', type: 'object', description: 'Object to get values from' }
    ],
    output: { type: 'array', description: 'Array of property values' }
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
      { name: 'a', type: 'object', description: 'Base object' },
      { name: 'b', type: 'object', description: 'Object to merge in (overrides a)' }
    ],
    output: { type: 'object', description: 'Merged object' }
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
  characteristics: { stateless: false, atomic: true, composable: true },
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
      
      const results = await context.executeGraph(input.nodes, (input as any).__scope ?? context.currentScope);
      const lastNodeId = input.nodes.order[input.nodes.order.length - 1];
      const shouldKeep = results[lastNodeId];
      
      if (shouldKeep === true) {
        result.push(input.array[i]);
      }
    }
    
    return { success: true, data: result };
  },
};

export const mapAtom: Atom = {
  name: 'map',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array', description: 'Array to map over' },
      { name: 'nodes', type: 'object', description: 'Graph to execute for each item, return value becomes new item' },
      { name: 'itemKey', type: 'string', description: 'Key to store current item in store' },
      { name: 'indexKey', type: 'string', description: 'Optional key to store current index' }
    ],
    output: { type: 'array', description: 'New array with transformed items' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
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
      
      const results = await context.executeGraph(input.nodes, (input as any).__scope ?? context.currentScope);
      const lastNodeId = input.nodes.order[input.nodes.order.length - 1];
      result.push(results[lastNodeId]);
    }
    
    return { success: true, data: result };
  },
};

export const formatAtom: Atom = {
  name: 'format',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'template', type: 'string', description: 'Template with {placeholder} syntax' }
    ],
    output: { type: 'string', description: 'Formatted string with placeholders replaced' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { template: string; [key: string]: any }, context: Context): Promise<Result> => {
    let result = input.template;
    
    for (const [key, value] of Object.entries(input)) {
      if (key === 'template') continue;
      const placeholder = `{${key}}`;
      const strValue = (typeof value === 'object' && value !== null) ? JSON.stringify(value, null, 2) : String(value);
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), strValue);
    }
    
    return { success: true, data: result };
  },
};

export const toNumAtom: Atom = {
  name: 'toNum',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any', description: 'Value to convert to number' }
    ],
    output: { type: 'number', description: 'Numeric value or NaN if conversion fails' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    const num = Number(input.value);
    return { success: true, data: num };
  },
};

export const containsAtom: Atom = {
  name: 'contains',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'String to search in' },
      { name: 'search', type: 'string', description: 'Substring to look for' }
    ],
    output: { type: 'boolean', description: 'True if text contains search' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string; search: string }, context: Context): Promise<Result> => {
    return { success: true, data: String(input.text).includes(String(input.search)) };
  },
};

export const includesAtom: Atom = {
  name: 'includes',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array', description: 'Array to search in' },
      { name: 'value', type: 'any', description: 'Value to search for' }
    ],
    output: { type: 'boolean', description: 'True if array contains the value' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { array: any[]; value: any }, context: Context): Promise<Result> => {
    if (!Array.isArray(input.array)) {
      return { success: true, data: false };
    }
    return { success: true, data: input.array.includes(input.value) };
  },
};

export const startsWithAtom: Atom = {
  name: 'startsWith',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'String to check' },
      { name: 'prefix', type: 'string', description: 'Prefix to test' }
    ],
    output: { type: 'boolean', description: 'True if text starts with prefix' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string; prefix: string }, context: Context): Promise<Result> => {
    return { success: true, data: String(input.text).startsWith(String(input.prefix)) };
  },
};

export const replaceAtom: Atom = {
  name: 'replace',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'Source string' },
      { name: 'search', type: 'string', description: 'Substring to find' },
      { name: 'replacement', type: 'string', description: 'Replacement string' }
    ],
    output: { type: 'string', description: 'String with first occurrence replaced' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string; search: string; replacement: string }, context: Context): Promise<Result> => {
    return { success: true, data: String(input.text).replace(String(input.search), String(input.replacement)) };
  },
};

export const trimAtom: Atom = {
  name: 'trim',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'String to trim' }
    ],
    output: { type: 'string', description: 'Trimmed string' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string }, context: Context): Promise<Result> => {
    return { success: true, data: String(input.text).trim() };
  },
};

export const toLowerAtom: Atom = {
  name: 'toLower',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'String to convert' }
    ],
    output: { type: 'string', description: 'Lowercase string' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string }, context: Context): Promise<Result> => {
    return { success: true, data: String(input.text).toLowerCase() };
  },
};

export const toUpperAtom: Atom = {
  name: 'toUpper',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'String to convert' }
    ],
    output: { type: 'string', description: 'Uppercase string' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string }, context: Context): Promise<Result> => {
    return { success: true, data: String(input.text).toUpperCase() };
  },
};

export const getAtAtom: Atom = {
  name: 'getAt',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array', description: 'Array to index into' },
      { name: 'index', type: 'number', description: 'Index to retrieve' }
    ],
    output: { type: 'any', description: 'Element at the given index' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { array: any[]; index: number }, context: Context): Promise<Result> => {
    if (!Array.isArray(input.array)) {
      return { success: false, error: 'Input is not an array' };
    }
    const idx = Number(input.index);
    if (idx < 0 || idx >= input.array.length) {
      return { success: true, data: null };
    }
    return { success: true, data: input.array[idx] };
  },
};

export const joinAtom: Atom = {
  name: 'join',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'array', type: 'array', description: 'Array of items to join' },
      { name: 'separator', type: 'string', description: 'Separator between items' }
    ],
    output: { type: 'string', description: 'Joined string' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { array: any[]; separator: string }, context: Context): Promise<Result> => {
    if (!Array.isArray(input.array)) {
      return { success: true, data: String(input.array) };
    }
    return { success: true, data: input.array.join(String(input.separator)) };
  },
};
