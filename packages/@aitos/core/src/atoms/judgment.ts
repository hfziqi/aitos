import { Atom, Context, Result } from '../types';

export const eqAtom: Atom = {
  name: 'eq',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'any' },
      { name: 'b', type: 'any' }
    ],
    output: { type: 'boolean' }
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
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'boolean' }
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
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'boolean' }
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
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'boolean' }
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
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'boolean' }
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
      { name: 'a', type: 'boolean' },
      { name: 'b', type: 'boolean' }
    ],
    output: { type: 'boolean' }
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
      { name: 'a', type: 'boolean' },
      { name: 'b', type: 'boolean' }
    ],
    output: { type: 'boolean' }
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
      { name: 'value', type: 'boolean' }
    ],
    output: { type: 'boolean' }
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
      { name: 'value', type: 'any' }
    ],
    output: { type: 'boolean' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    return { success: true, data: input.value === null || input.value === undefined };
  },
};

export const isNumAtom: Atom = {
  name: 'isNum',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'value', type: 'any' }
    ],
    output: { type: 'boolean' }
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
      { name: 'value', type: 'any' }
    ],
    output: { type: 'boolean' }
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
      { name: 'value', type: 'any' }
    ],
    output: { type: 'boolean' }
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
      { name: 'value', type: 'any' }
    ],
    output: { type: 'boolean' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { value: any }, context: Context): Promise<Result> => {
    return { success: true, data: typeof input.value === 'object' && input.value !== null && !Array.isArray(input.value) };
  },
};
