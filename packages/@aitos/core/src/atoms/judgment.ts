import { Atom, Context, Result } from '../types';

export const eqAtom: Atom = {
  name: 'eq',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'any', description: 'First value to compare' },
      { name: 'b', type: 'any', description: 'Second value to compare' }
    ],
    output: { type: 'boolean', description: 'True if a equals b' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: any; b: any }, context: Context): Promise<Result> => {
    return { success: true, data: input.a === input.b };
  },
};

export const gtAtom: Atom = {
  name: 'gt',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number', description: 'First number' },
      { name: 'b', type: 'number', description: 'Second number' }
    ],
    output: { type: 'boolean', description: 'True if the comparison holds' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a > input.b };
  },
};

export const ltAtom: Atom = {
  name: 'lt',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number', description: 'First number' },
      { name: 'b', type: 'number', description: 'Second number' }
    ],
    output: { type: 'boolean', description: 'True if the comparison holds' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a < input.b };
  },
};

export const gteAtom: Atom = {
  name: 'gte',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number', description: 'First number' },
      { name: 'b', type: 'number', description: 'Second number' }
    ],
    output: { type: 'boolean', description: 'True if the comparison holds' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a >= input.b };
  },
};

export const lteAtom: Atom = {
  name: 'lte',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number', description: 'First number' },
      { name: 'b', type: 'number', description: 'Second number' }
    ],
    output: { type: 'boolean', description: 'True if the comparison holds' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a <= input.b };
  },
};

export const andAtom: Atom = {
  name: 'and',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'boolean', description: 'First boolean' },
      { name: 'b', type: 'boolean', description: 'Second boolean' }
    ],
    output: { type: 'boolean', description: 'Result of the logical operation' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: boolean; b: boolean }, context: Context): Promise<Result> => {
    return { success: true, data: !!input.a && !!input.b };
  },
};

export const orAtom: Atom = {
  name: 'or',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'boolean', description: 'First boolean' },
      { name: 'b', type: 'boolean', description: 'Second boolean' }
    ],
    output: { type: 'boolean', description: 'Result of the logical operation' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: boolean; b: boolean }, context: Context): Promise<Result> => {
    return { success: true, data: !!input.a || !!input.b };
  },
};

export const notAtom: Atom = {
  name: 'not',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'boolean', description: 'Boolean value to negate' }
    ],
    output: { type: 'boolean', description: 'Negated value' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: boolean }, context: Context): Promise<Result> => {
    return { success: true, data: !input.value };
  },
};

export const isNilAtom: Atom = {
  name: 'isNil',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any', description: 'Value to check' }
    ],
    output: { type: 'boolean', description: 'True if the type check passes' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    return { success: true, data: input.value === null || input.value === undefined };
  },
};

// Failure convention: when a node fails, the runtime converts its result to { __error: <message> }.
// Detect failure with isError / isSuccess — do not read the __error field directly (explicit data-flow standard).
export const isErrorAtom: Atom = {
  name: 'isError',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any', description: 'Node result to check' }
    ],
    output: { type: 'boolean', description: 'True if the value is a failed node result ({ __error: ... })' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    const v = input.value;
    return {
      success: true,
      data: !!(v && typeof v === 'object' && v.__error !== undefined && v.__error !== null)
    };
  },
};

export const isSuccessAtom: Atom = {
  name: 'isSuccess',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any', description: 'Node result to check' }
    ],
    output: { type: 'boolean', description: 'True if the value is NOT a failed node result' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    const v = input.value;
    const isErr = !!(v && typeof v === 'object' && v.__error !== undefined && v.__error !== null);
    return { success: true, data: !isErr };
  },
};

export const isNumAtom: Atom = {
  name: 'isNum',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any', description: 'Value to check' }
    ],
    output: { type: 'boolean', description: 'True if the type check passes' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    return { success: true, data: typeof input.value === 'number' && !isNaN(input.value) };
  },
};

export const isStrAtom: Atom = {
  name: 'isStr',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any', description: 'Value to check' }
    ],
    output: { type: 'boolean', description: 'True if the type check passes' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    return { success: true, data: typeof input.value === 'string' };
  },
};

export const isArrAtom: Atom = {
  name: 'isArr',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any', description: 'Value to check' }
    ],
    output: { type: 'boolean', description: 'True if the type check passes' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    return { success: true, data: Array.isArray(input.value) };
  },
};

export const isObjAtom: Atom = {
  name: 'isObj',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any', description: 'Value to check' }
    ],
    output: { type: 'boolean', description: 'True if the type check passes' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    return { success: true, data: typeof input.value === 'object' && input.value !== null && !Array.isArray(input.value) };
  },
};
