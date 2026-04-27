import { Atom, Context, Result } from 'aitos';

const keyState = new Map<string, boolean>();

function initKeyListener(): void {
  if (typeof window !== 'undefined' && !((window as any).__aitosKeyListenerAdded)) {
    window.addEventListener('keydown', (e) => {
      keyState.set(e.key, true);
    });
    window.addEventListener('keyup', (e) => {
      keyState.set(e.key, false);
    });
    (window as any).__aitosKeyListenerAdded = true;
  }
}

initKeyListener();

export const getKeyAtom: Atom = {
  name: 'getKey',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'key', type: 'string', description: 'Key name (e.g. "ArrowUp", "a", "Enter", "Space")' }
    ],
    output: { type: 'boolean', description: 'true if key is currently pressed' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { key: string }, context: Context): Promise<Result> => {
    const pressed = keyState.get(input.key) ?? false;
    return { success: true, data: pressed };
  },
};
