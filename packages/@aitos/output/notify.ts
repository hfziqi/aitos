import { Atom, Context, Result } from 'aitos';

export const showAlertAtom: Atom = {
  name: 'showAlert',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'message', type: 'string', description: 'Alert message' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { message: string }, context: Context): Promise<Result> => {
    if (typeof alert !== 'undefined') {
      alert(input.message);
      return { success: true, data: null };
    }
    return { success: false, error: 'Alert not available' };
  },
};

export const showConfirmAtom: Atom = {
  name: 'showConfirm',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'message', type: 'string', description: 'Confirm message' }
    ],
    output: { type: 'boolean', description: 'User choice (true = OK, false = Cancel)' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { message: string }, context: Context): Promise<Result> => {
    if (typeof confirm !== 'undefined') {
      return { success: true, data: confirm(input.message) };
    }
    return { success: false, error: 'Confirm not available' };
  },
};

export const showPromptAtom: Atom = {
  name: 'showPrompt',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'message', type: 'string', description: 'Prompt message' },
      { name: 'default', type: 'string', description: 'Default value' }
    ],
    output: { type: 'string', description: 'User input or null if cancelled' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { message: string; default?: string }, context: Context): Promise<Result> => {
    if (typeof prompt !== 'undefined') {
      const result = prompt(input.message, input.default || '');
      if (result === null) {
        return { success: false, error: 'User cancelled' };
      }
      return { success: true, data: result };
    }
    return { success: false, error: 'Prompt not available' };
  },
};

export const showNotificationAtom: Atom = {
  name: 'showNotification',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'title', type: 'string', description: 'Notification title' },
      { name: 'body', type: 'string', description: 'Notification body' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { title: string; body: string }, context: Context): Promise<Result> => {
    if (typeof Notification !== 'undefined') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(input.title, { body: input.body });
          return { success: true, data: null };
        }
        return { success: false, error: 'Notification permission denied' };
      } catch (error) {
        return { success: false, error: `Notification failed: ${error}` };
      }
    }
    return { success: false, error: 'Notification not available' };
  },
};
