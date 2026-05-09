import { Context, Result } from '@aitos/core';
import { BridgeAtom } from '@aitos/bridge';

class ReadLocalAtom extends BridgeAtom {
  name = 'readLocal';
  version = '1.0.1';
  meta = {
    input: [
      { name: 'key', type: 'string', description: 'Local data key (path relative to storage)' }
    ],
    output: { type: 'any', description: 'Stored data (parsed from JSON if applicable), null if not found' }
  };

  async execute(input: { key: string }, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Bridge not available. This atom requires desktop environment.' };
    }

    try {
      const result = await this.callBridge('readLocal', { key: input.key });

      if (!result.success) {
        return { success: true, data: null };
      }

      try {
        const parsed = JSON.parse(result.value);
        return { success: true, data: parsed };
      } catch {
        return { success: true, data: result.value };
      }
    } catch (error) {
      return { success: true, data: null };
    }
  }
}

class WriteLocalAtom extends BridgeAtom {
  name = 'writeLocal';
  version = '1.0.0';
  meta = {
    input: [
      { name: 'key', type: 'string', description: 'Local data key (path relative to storage)' },
      { name: 'value', type: 'any', description: 'Data to store (object will be JSON stringified)' }
    ],
    output: { type: 'boolean', description: 'true if stored successfully' }
  };

  async execute(input: { key: string; value: any }, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Bridge not available. This atom requires desktop environment.' };
    }

    try {
      let contentStr: string;
      if (typeof input.value === 'string') {
        contentStr = input.value;
      } else {
        contentStr = JSON.stringify(input.value, null, 2);
      }
      await this.callBridge('writeLocal', { key: input.key, value: contentStr });
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: `Failed to write local data: ${error}` };
    }
  }
}

class ListLocalAtom extends BridgeAtom {
  name = 'listLocal';
  version = '1.0.0';
  meta = {
    input: [
      { name: 'scope', type: 'string', description: 'Scope to list (empty for all)', optional: true }
    ],
    output: { type: 'array', description: 'Array of available keys' }
  };

  async execute(input: { scope?: string }, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Bridge not available. This atom requires desktop environment.' };
    }

    try {
      const result = await this.callBridge('listLocal', { scope: input.scope || '' });
      return { success: true, data: result.keys || [] };
    } catch (error) {
      return { success: true, data: [] };
    }
  }
}

class RemoveLocalAtom extends BridgeAtom {
  name = 'removeLocal';
  version = '1.0.0';
  meta = {
    input: [
      { name: 'key', type: 'string', description: 'Local data key to remove' }
    ],
    output: { type: 'boolean', description: 'true if removed successfully' }
  };

  async execute(input: { key: string }, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Bridge not available. This atom requires desktop environment.' };
    }

    try {
      await this.callBridge('removeLocal', { key: input.key });
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: `Failed to remove local data: ${error}` };
    }
  }
}

export const readLocalAtom = new ReadLocalAtom();
export const writeLocalAtom = new WriteLocalAtom();
export const listLocalAtom = new ListLocalAtom();
export const removeLocalAtom = new RemoveLocalAtom();
