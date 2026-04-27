import { Atom, Context, Result } from 'aitos';

export const getMousePositionAtom: Atom = {
  name: 'getMousePosition',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID to track mouse position' },
      { name: 'xKey', type: 'string', description: 'Store key for X coordinate' },
      { name: 'yKey', type: 'string', description: 'Store key for Y coordinate' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; xKey: string; yKey: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'Mouse position requires browser environment' };
    }

    const el = document.getElementById(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    const handler = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      context.store.set(input.xKey, event.clientX - rect.left);
      context.store.set(input.yKey, event.clientY - rect.top);
    };

    el.addEventListener('mousemove', handler);
    
    return { success: true, data: { done: true } };
  },
};

export const getTouchAtom: Atom = {
  name: 'getTouch',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID to listen for touches' },
      { name: 'xKey', type: 'string', description: 'Store key for X coordinate' },
      { name: 'yKey', type: 'string', description: 'Store key for Y coordinate' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; xKey: string; yKey: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'Touch requires browser environment' };
    }

    const el = document.getElementById(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    const handler = (event: TouchEvent) => {
      const touch = event.touches[0];
      const rect = el.getBoundingClientRect();
      context.store.set(input.xKey, touch.clientX - rect.left);
      context.store.set(input.yKey, touch.clientY - rect.top);
    };

    el.addEventListener('touchstart', handler);
    el.addEventListener('touchmove', handler);
    
    return { success: true, data: { done: true } };
  },
};

export const addEventListenerAtom: Atom = {
  name: 'addEventListener',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID or "window" or "document"' },
      { name: 'event', type: 'string', description: 'Event type (e.g., "click", "resize", "input")' },
      { name: 'storeKey', type: 'string', description: 'Key to store event data in context store' },
      { name: 'action', type: 'string', description: 'Optional graph file to execute when event fires' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; event: string; storeKey: string; action?: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'addEventListener requires browser environment' };
    }

    const listenerKey = `__listener_${input.id}_${input.event}`;
    if (context.store.get(listenerKey)) {
      return { success: true, data: null };
    }

    let target: EventTarget | null = null;
    if (input.id === 'window') {
      target = window;
    } else if (input.id === 'document') {
      target = document;
    } else {
      target = document.getElementById(input.id);
    }

    if (!target) {
      return { success: false, error: `Target "${input.id}" not found` };
    }

    const handler = async (e: Event) => {
      const eventData: any = { type: e.type };
      
      if (e instanceof MouseEvent) {
        eventData.x = e.clientX;
        eventData.y = e.clientY;
        eventData.button = e.button;
      } else if (e instanceof KeyboardEvent) {
        eventData.key = e.key;
        eventData.code = e.code;
        eventData.shiftKey = e.shiftKey;
        eventData.ctrlKey = e.ctrlKey;
        eventData.altKey = e.altKey;
      } else if (e instanceof Event && (e.target as any)?.value !== undefined) {
        eventData.value = (e.target as any).value;
      }
      
      if (e.target) {
        let targetEl = e.target as HTMLElement;
        while (targetEl && targetEl !== document.body) {
          if ((targetEl as any).id) {
            eventData.targetId = (targetEl as any).id;
            break;
          }
          targetEl = targetEl.parentElement as HTMLElement;
        }
      }

      if (e.target && (e.target as any).dataset) {
        eventData.targetData = (e.target as any).dataset;
      }
      
      context.store.set(input.storeKey, eventData);
      
      if (input.action && context.executeGraph) {
        const graph = context.store.get(`__graph_${input.action}`);
        if (graph) {
          await context.executeGraph(graph);
        }
      }
    };

    target.addEventListener(input.event, handler);
    context.store.set(listenerKey, { handler, target });

    return { success: true, data: null };
  },
};

export const removeEventListenerAtom: Atom = {
  name: 'removeEventListener',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID or "window" or "document"' },
      { name: 'event', type: 'string', description: 'Event type' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; event: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'removeEventListener requires browser environment' };
    }

    const listenerKey = `__listener_${input.id}_${input.event}`;
    const listenerData = context.store.get(listenerKey);

    if (listenerData) {
      const { handler, target } = listenerData;
      target.removeEventListener(input.event, handler);
      context.store.delete(listenerKey);
    }

    return { success: true, data: null };
  },
};
