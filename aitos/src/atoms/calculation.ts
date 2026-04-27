import { Atom, Context, Result } from '../types';

export const addAtom: Atom = {
  name: 'add',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'number' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a + input.b };
  },
};

export const subAtom: Atom = {
  name: 'sub',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'number' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a - input.b };
  },
};

export const mulAtom: Atom = {
  name: 'mul',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'number' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a * input.b };
  },
};

export const divAtom: Atom = {
  name: 'div',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'number' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a / input.b };
  },
};

export const modAtom: Atom = {
  name: 'mod',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'a', type: 'number' },
      { name: 'b', type: 'number' }
    ],
    output: { type: 'number' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { a: number; b: number }, context: Context): Promise<Result> => {
    return { success: true, data: input.a % input.b };
  },
};

export const randomAtom: Atom = {
  name: 'random',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'min', type: 'number' },
      { name: 'max', type: 'number' }
    ],
    output: { type: 'number' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { min: number; max: number }, context: Context): Promise<Result> => {
    const { min, max } = input;
    return { success: true, data: Math.floor(Math.random() * (max - min + 1)) + min };
  },
};
