import { Atom, Context, Result } from '../types';

export const getAtom: Atom = {
  name: 'get',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'key', type: 'string', description: 'State key name' }
    ],
    output: { type: 'any', description: 'Stored value' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { key: string }, context: Context): Promise<Result> => {
    const value = context.store.get(input.key);
    return { success: true, data: value ?? null };
  },
};

export const setAtom: Atom = {
  name: 'set',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'key', type: 'string', description: 'State key name' },
      { name: 'value', type: 'any', description: 'Value to store' }
    ],
    output: { type: 'any', description: 'The value that was set' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { key: string; value: any }, context: Context): Promise<Result> => {
    context.store.set(input.key, input.value);
    return { success: true, data: input.value };
  },
};
