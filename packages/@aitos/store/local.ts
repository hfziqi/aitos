import { Atom, Context, Result } from 'aitos';

export const getItemAtom: Atom = {
  name: 'getItem',
  version: '1.1.0',
  meta: {
    input: [
      { name: 'key', type: 'string', description: 'Storage key' }
    ],
    output: { type: 'any', description: 'Stored value (parsed from JSON) or null' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { key: string }, context: Context): Promise<Result> => {
    if (typeof localStorage === 'undefined') {
      return { success: false, error: 'localStorage not available' };
    }
    try {
      const value = localStorage.getItem(input.key);
      if (value === null) {
        return { success: true, data: null };
      }
      try {
        const parsed = JSON.parse(value);
        return { success: true, data: parsed };
      } catch {
        return { success: true, data: value };
      }
    } catch (error) {
      return { success: false, error: `Failed to get item: ${error}` };
    }
  },
};

export const setItemAtom: Atom = {
  name: 'setItem',
  version: '1.1.0',
  meta: {
    input: [
      { name: 'key', type: 'string', description: 'Storage key' },
      { name: 'value', type: 'any', description: 'Value to store (will be JSON stringified)' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { key: string; value: any }, context: Context): Promise<Result> => {
    if (typeof localStorage === 'undefined') {
      return { success: false, error: 'localStorage not available' };
    }
    try {
      const stringValue = typeof input.value === 'string' 
        ? input.value 
        : JSON.stringify(input.value);
      localStorage.setItem(input.key, stringValue);
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: `Failed to set item: ${error}` };
    }
  },
};

export const removeItemAtom: Atom = {
  name: 'removeItem',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'key', type: 'string', description: 'Storage key to remove' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { key: string }, context: Context): Promise<Result> => {
    if (typeof localStorage === 'undefined') {
      return { success: false, error: 'localStorage not available' };
    }
    try {
      localStorage.removeItem(input.key);
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: `Failed to remove item: ${error}` };
    }
  },
};

export const clearStorageAtom: Atom = {
  name: 'clearStorage',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    if (typeof localStorage === 'undefined') {
      return { success: false, error: 'localStorage not available' };
    }
    try {
      localStorage.clear();
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: `Failed to clear storage: ${error}` };
    }
  },
};

export const getKeysAtom: Atom = {
  name: 'getKeys',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'array', description: 'Array of storage keys' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    if (typeof localStorage === 'undefined') {
      return { success: false, error: 'localStorage not available' };
    }
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return { success: true, data: keys };
    } catch (error) {
      return { success: false, error: `Failed to get keys: ${error}` };
    }
  },
};
