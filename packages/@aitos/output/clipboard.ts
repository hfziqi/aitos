import { Atom, Context, Result } from '@aitos/core';

export const copyToClipboardAtom: Atom = {
  name: 'copyToClipboard',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'Text to copy to clipboard' }
    ],
    output: { type: 'object', description: '{ success: boolean }' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { text: string }, context: Context): Promise<Result> => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        context.store.set('copyResult_success', false);
        return { success: false, error: 'Clipboard API not available' };
      }
      await navigator.clipboard.writeText(input.text);
      // Explicit data flow: expose the result under a dedicated key so graphs
      // can read get(key: "copyResult_success") without getProp.
      context.store.set('copyResult_success', true);
      return { success: true, data: { success: true } };
    } catch (e: any) {
      context.store.set('copyResult_success', false);
      return { success: false, error: `Failed to copy: ${e.message}` };
    }
  },
};