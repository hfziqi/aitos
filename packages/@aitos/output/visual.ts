import { Atom, Context, Result } from 'aitos';

let elementStore: Map<string, HTMLElement> = new Map();
let elementIdCounter = 0;
let currentCanvas: HTMLCanvasElement | null = null;
let currentCtx: CanvasRenderingContext2D | null = null;

export function getElement(id: string): HTMLElement | null {
  const fromStore = elementStore.get(id);
  if (fromStore) {
    return fromStore;
  }
  
  if (typeof document !== 'undefined') {
    const fromDOM = document.getElementById(id);
    if (fromDOM) {
      elementStore.set(id, fromDOM);
      return fromDOM;
    }
  }
  
  return null;
}

export function setElement(id: string, el: HTMLElement): void {
  elementStore.set(id, el);
}

export function removeElement(id: string): void {
  elementStore.delete(id);
}

export function generateElementId(): string {
  return `el_${++elementIdCounter}`;
}

export function getCanvas(): HTMLCanvasElement | null {
  return currentCanvas;
}

export function setCanvas(canvas: HTMLCanvasElement): void {
  currentCanvas = canvas;
  currentCtx = canvas.getContext('2d');
}

export function getCanvasContext(): CanvasRenderingContext2D | null {
  return currentCtx;
}

export const createElementAtom: Atom = {
  name: 'createElement',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'tag', type: 'string', description: 'HTML tag name' },
      { name: 'id', type: 'string', description: 'Element ID' }
    ],
    output: { type: 'string', description: 'Element ID for later reference' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { tag: string; id?: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'createElement requires browser environment' };
    }

    const id = input.id || generateElementId();
    
    if (input.id) {
      const existingEl = document.getElementById(input.id);
      if (existingEl) {
        setElement(id, existingEl);
        return { success: true, data: id };
      }
    }

    const el = document.createElement(input.tag);
    
    if (input.id) {
      el.id = input.id;
    }
    
    setElement(id, el);
    
    return { success: true, data: id };
  },
};

export const appendChildAtom: Atom = {
  name: 'appendChild',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'parentId', type: 'string', description: 'Parent element ID or "body"' },
      { name: 'childId', type: 'string', description: 'Child element ID' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { parentId: string; childId: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'appendChild requires browser environment' };
    }

    const child = getElement(input.childId);
    if (!child) {
      return { success: false, error: `Child element "${input.childId}" not found` };
    }

    let parent: HTMLElement | null = null;
    if (input.parentId === 'body') {
      parent = document.body;
    } else {
      parent = getElement(input.parentId);
    }

    if (!parent) {
      return { success: false, error: `Parent element "${input.parentId}" not found` };
    }

    parent.appendChild(child);
    return { success: true, data: null };
  },
};

export const removeChildAtom: Atom = {
  name: 'removeChild',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'parentId', type: 'string', description: 'Parent element ID or "body"' },
      { name: 'childId', type: 'string', description: 'Child element ID' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { parentId: string; childId: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'removeChild requires browser environment' };
    }

    const child = getElement(input.childId);
    if (!child) {
      return { success: false, error: `Child element "${input.childId}" not found` };
    }

    let parent: HTMLElement | null = null;
    if (input.parentId === 'body') {
      parent = document.body;
    } else {
      parent = getElement(input.parentId);
    }

    if (!parent) {
      return { success: false, error: `Parent element "${input.parentId}" not found` };
    }

    parent.removeChild(child);
    removeElement(input.childId);
    return { success: true, data: null };
  },
};

export const setStyleAtom: Atom = {
  name: 'setStyle',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'prop', type: 'string', description: 'CSS property name' },
      { name: 'value', type: 'string', description: 'CSS property value' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; prop: string; value: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'setStyle requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    if (input.prop.startsWith('-') || input.prop.includes('-')) {
      el.style.setProperty(input.prop, input.value);
    } else {
      (el.style as any)[input.prop] = input.value;
    }
    return { success: true, data: null };
  },
};

export const setStylesAtom: Atom = {
  name: 'setStyles',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'styles', type: 'object', description: 'CSS styles object { prop: value }' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; styles: Record<string, string> }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'setStyles requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    for (const [prop, value] of Object.entries(input.styles)) {
      if (prop.startsWith('-') || prop.includes('-')) {
        el.style.setProperty(prop, value);
      } else {
        (el.style as any)[prop] = value;
      }
    }
    return { success: true, data: null };
  },
};

export const injectCSSAtom: Atom = {
  name: 'injectCSS',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'css', type: 'string', description: 'CSS string to inject' },
      { name: 'id', type: 'string', description: 'Style element ID (optional)' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { css: string; id?: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'injectCSS requires browser environment' };
    }

    let styleEl: HTMLStyleElement;
    
    if (input.id) {
      styleEl = document.getElementById(input.id) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = input.id;
        document.head.appendChild(styleEl);
      }
    } else {
      styleEl = document.createElement('style');
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = input.css;
    return { success: true, data: null };
  },
};

export const setAttributeAtom: Atom = {
  name: 'setAttribute',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'name', type: 'string', description: 'Attribute name' },
      { name: 'value', type: 'string', description: 'Attribute value' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; name: string; value: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'setAttribute requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    el.setAttribute(input.name, input.value);
    return { success: true, data: null };
  },
};

export const getAttributeAtom: Atom = {
  name: 'getAttribute',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'name', type: 'string', description: 'Attribute name' }
    ],
    output: { type: 'string', description: 'Attribute value or null' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; name: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'getAttribute requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    return { success: true, data: el.getAttribute(input.name) };
  },
};

export const setTextContentAtom: Atom = {
  name: 'setTextContent',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'text', type: 'string', description: 'Text content' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; text: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'setTextContent requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    el.textContent = input.text;
    return { success: true, data: null };
  },
};

export const getElementByIdAtom: Atom = {
  name: 'getElementById',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'domId', type: 'string', description: 'DOM element ID attribute' },
      { name: 'storeId', type: 'string', description: 'ID to store the element reference' }
    ],
    output: { type: 'string', description: 'Store ID or null if not found' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { domId: string; storeId?: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'getElementById requires browser environment' };
    }

    const el = document.getElementById(input.domId);
    if (!el) {
      return { success: true, data: null };
    }

    const storeId = input.storeId || generateElementId();
    setElement(storeId, el);
    return { success: true, data: storeId };
  },
};

export const querySelectorAtom: Atom = {
  name: 'querySelector',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'selector', type: 'string', description: 'CSS selector' },
      { name: 'storeId', type: 'string', description: 'ID to store the element reference' }
    ],
    output: { type: 'string', description: 'Store ID or null if not found' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { selector: string; storeId?: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'querySelector requires browser environment' };
    }

    const el = document.querySelector(input.selector);
    if (!el) {
      return { success: true, data: null };
    }

    const storeId = input.storeId || generateElementId();
    setElement(storeId, el as HTMLElement);
    return { success: true, data: storeId };
  },
};

export const getBoundingClientRectAtom: Atom = {
  name: 'getBoundingClientRect',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' }
    ],
    output: { type: 'object', description: '{ x, y, width, height, top, right, bottom, left }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'getBoundingClientRect requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    const rect = el.getBoundingClientRect();
    return { 
      success: true, 
      data: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
      }
    };
  },
};

export const getWindowSizeAtom: Atom = {
  name: 'getWindowSize',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'object', description: '{ width, height }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    if (typeof window === 'undefined') {
      return { success: false, error: 'getWindowSize requires browser environment' };
    }

    return { 
      success: true, 
      data: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  },
};

export const clearElementAtom: Atom = {
  name: 'clearElement',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID to clear' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'clearElement requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }

    return { success: true, data: null };
  },
};

export const setValueAtom: Atom = {
  name: 'setValue',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'value', type: 'string', description: 'Value to set' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; value: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'setValue requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    (el as HTMLInputElement).value = input.value;
    return { success: true, data: null };
  },
};

export const getValueAtom: Atom = {
  name: 'getValue',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' }
    ],
    output: { type: 'string', description: 'Element value' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'getValue requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    return { success: true, data: (el as HTMLInputElement).value };
  },
};

export const setCanvasAtom: Atom = {
  name: 'setCanvas',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Canvas element ID' }
    ],
    output: { type: 'object', description: '{ width, height }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'setCanvas requires browser environment' };
    }

    const canvas = document.getElementById(input.id) as HTMLCanvasElement | null;
    if (!canvas) {
      return { success: false, error: `Canvas element "${input.id}" not found` };
    }

    setCanvas(canvas);
    return { 
      success: true, 
      data: { 
        width: canvas.width, 
        height: canvas.height 
      } 
    };
  },
};

export const getCanvasSizeAtom: Atom = {
  name: 'getCanvasSize',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'object', description: '{ width, height }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    const canvas = getCanvas();
    if (!canvas) return { success: false, error: 'Canvas not initialized' };
    
    return { 
      success: true, 
      data: { 
        width: canvas.width, 
        height: canvas.height 
      } 
    };
  },
};

export const setCanvasSizeAtom: Atom = {
  name: 'setCanvasSize',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'width', type: 'number', description: 'Canvas width' },
      { name: 'height', type: 'number', description: 'Canvas height' }
    ],
    output: { type: 'object', description: '{ width, height }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { width: number; height: number }, context: Context): Promise<Result> => {
    const canvas = getCanvas();
    if (!canvas) return { success: false, error: 'Canvas not initialized' };
    
    canvas.width = input.width;
    canvas.height = input.height;
    
    return { 
      success: true, 
      data: { 
        width: canvas.width, 
        height: canvas.height 
      } 
    };
  },
};

export const clearCanvasAtom: Atom = {
  name: 'clearCanvas',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    const canvas = getCanvas();
    if (!ctx || !canvas) return { success: false, error: 'Canvas not initialized' };
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return { success: true, data: null };
  },
};

export const beginPathAtom: Atom = {
  name: 'beginPath',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.beginPath();
    return { success: true, data: null };
  },
};

export const moveToAtom: Atom = {
  name: 'moveTo',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'x', type: 'number', description: 'X position' },
      { name: 'y', type: 'number', description: 'Y position' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { x: number; y: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.moveTo(input.x, input.y);
    return { success: true, data: null };
  },
};

export const lineToAtom: Atom = {
  name: 'lineTo',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'x', type: 'number', description: 'X position' },
      { name: 'y', type: 'number', description: 'Y position' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { x: number; y: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.lineTo(input.x, input.y);
    return { success: true, data: null };
  },
};

export const arcAtom: Atom = {
  name: 'arc',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'x', type: 'number', description: 'Center X position' },
      { name: 'y', type: 'number', description: 'Center Y position' },
      { name: 'r', type: 'number', description: 'Radius' },
      { name: 'startAngle', type: 'number', description: 'Start angle in radians' },
      { name: 'endAngle', type: 'number', description: 'End angle in radians' },
      { name: 'counterclockwise', type: 'boolean', description: 'Draw counterclockwise' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { x: number; y: number; r: number; startAngle?: number; endAngle?: number; counterclockwise?: boolean }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.arc(
      input.x, 
      input.y, 
      input.r, 
      input.startAngle ?? 0, 
      input.endAngle ?? Math.PI * 2, 
      input.counterclockwise ?? false
    );
    return { success: true, data: null };
  },
};

export const closePathAtom: Atom = {
  name: 'closePath',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.closePath();
    return { success: true, data: null };
  },
};

export const fillAtom: Atom = {
  name: 'fill',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'fillRule', type: 'string', description: 'Fill rule: "nonzero" or "evenodd"' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { fillRule?: 'nonzero' | 'evenodd' }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    if (input.fillRule) {
      ctx.fill(input.fillRule);
    } else {
      ctx.fill();
    }
    return { success: true, data: null };
  },
};

export const strokeAtom: Atom = {
  name: 'stroke',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.stroke();
    return { success: true, data: null };
  },
};

export const fillRectAtom: Atom = {
  name: 'fillRect',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'x', type: 'number', description: 'X position' },
      { name: 'y', type: 'number', description: 'Y position' },
      { name: 'w', type: 'number', description: 'Width' },
      { name: 'h', type: 'number', description: 'Height' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { x: number; y: number; w: number; h: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.fillRect(input.x, input.y, input.w, input.h);
    return { success: true, data: null };
  },
};

export const strokeRectAtom: Atom = {
  name: 'strokeRect',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'x', type: 'number', description: 'X position' },
      { name: 'y', type: 'number', description: 'Y position' },
      { name: 'w', type: 'number', description: 'Width' },
      { name: 'h', type: 'number', description: 'Height' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { x: number; y: number; w: number; h: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.strokeRect(input.x, input.y, input.w, input.h);
    return { success: true, data: null };
  },
};

export const clearRectAtom: Atom = {
  name: 'clearRect',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'x', type: 'number', description: 'X position' },
      { name: 'y', type: 'number', description: 'Y position' },
      { name: 'w', type: 'number', description: 'Width' },
      { name: 'h', type: 'number', description: 'Height' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { x: number; y: number; w: number; h: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.clearRect(input.x, input.y, input.w, input.h);
    return { success: true, data: null };
  },
};

export const fillTextAtom: Atom = {
  name: 'fillText',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'Text to draw' },
      { name: 'x', type: 'number', description: 'X position' },
      { name: 'y', type: 'number', description: 'Y position' },
      { name: 'maxWidth', type: 'number', description: 'Maximum width' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string; x: number; y: number; maxWidth?: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    if (input.maxWidth !== undefined) {
      ctx.fillText(input.text, input.x, input.y, input.maxWidth);
    } else {
      ctx.fillText(input.text, input.x, input.y);
    }
    return { success: true, data: null };
  },
};

export const strokeTextAtom: Atom = {
  name: 'strokeText',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'Text to draw' },
      { name: 'x', type: 'number', description: 'X position' },
      { name: 'y', type: 'number', description: 'Y position' },
      { name: 'maxWidth', type: 'number', description: 'Maximum width' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string; x: number; y: number; maxWidth?: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    if (input.maxWidth !== undefined) {
      ctx.strokeText(input.text, input.x, input.y, input.maxWidth);
    } else {
      ctx.strokeText(input.text, input.x, input.y);
    }
    return { success: true, data: null };
  },
};

export const measureTextAtom: Atom = {
  name: 'measureText',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'text', type: 'string', description: 'Text to measure' }
    ],
    output: { type: 'object', description: '{ width }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { text: string }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    const metrics = ctx.measureText(input.text);
    return { success: true, data: { width: metrics.width } };
  },
};

export const setFillStyleAtom: Atom = {
  name: 'setFillStyle',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'style', type: 'string', description: 'Fill style (color, gradient, or pattern)' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { style: string }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.fillStyle = input.style;
    return { success: true, data: null };
  },
};

export const setStrokeStyleAtom: Atom = {
  name: 'setStrokeStyle',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'style', type: 'string', description: 'Stroke style (color, gradient, or pattern)' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { style: string }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.strokeStyle = input.style;
    return { success: true, data: null };
  },
};

export const setLineWidthAtom: Atom = {
  name: 'setLineWidth',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'width', type: 'number', description: 'Line width' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { width: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.lineWidth = input.width;
    return { success: true, data: null };
  },
};

export const setFontAtom: Atom = {
  name: 'setFont',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'font', type: 'string', description: 'Font specification (e.g., "16px Arial")' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { font: string }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.font = input.font;
    return { success: true, data: null };
  },
};

export const setGlobalAlphaAtom: Atom = {
  name: 'setGlobalAlpha',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'alpha', type: 'number', description: 'Alpha value (0-1)' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { alpha: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.globalAlpha = input.alpha;
    return { success: true, data: null };
  },
};

export const setTextAlignAtom: Atom = {
  name: 'setTextAlign',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'align', type: 'string', description: 'Text alignment: "left", "right", "center", "start", "end"' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { align: CanvasTextAlign }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.textAlign = input.align;
    return { success: true, data: null };
  },
};

export const setTextBaselineAtom: Atom = {
  name: 'setTextBaseline',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'baseline', type: 'string', description: 'Text baseline: "top", "hanging", "middle", "alphabetic", "ideographic", "bottom"' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { baseline: CanvasTextBaseline }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.textBaseline = input.baseline;
    return { success: true, data: null };
  },
};

export const saveAtom: Atom = {
  name: 'save',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.save();
    return { success: true, data: null };
  },
};

export const restoreAtom: Atom = {
  name: 'restore',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.restore();
    return { success: true, data: null };
  },
};

export const translateAtom: Atom = {
  name: 'translate',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'x', type: 'number', description: 'X translation' },
      { name: 'y', type: 'number', description: 'Y translation' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { x: number; y: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.translate(input.x, input.y);
    return { success: true, data: null };
  },
};

export const rotateAtom: Atom = {
  name: 'rotate',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'angle', type: 'number', description: 'Rotation angle in radians' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { angle: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.rotate(input.angle);
    return { success: true, data: null };
  },
};

export const scaleAtom: Atom = {
  name: 'scale',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'x', type: 'number', description: 'X scale factor' },
      { name: 'y', type: 'number', description: 'Y scale factor' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { x: number; y: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    ctx.scale(input.x, input.y);
    return { success: true, data: null };
  },
};

export const drawImageAtom: Atom = {
  name: 'drawImage',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'image', type: 'object', description: 'Image element or URL' },
      { name: 'x', type: 'number', description: 'X position' },
      { name: 'y', type: 'number', description: 'Y position' },
      { name: 'width', type: 'number', description: 'Width' },
      { name: 'height', type: 'number', description: 'Height' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { image: HTMLImageElement | string; x: number; y: number; width?: number; height?: number }, context: Context): Promise<Result> => {
    const ctx = getCanvasContext();
    if (!ctx) return { success: false, error: 'Canvas not initialized' };
    
    let img: HTMLImageElement;
    if (typeof input.image === 'string') {
      img = new Image();
      img.src = input.image;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    } else {
      img = input.image;
    }
    
    if (input.width !== undefined && input.height !== undefined) {
      ctx.drawImage(img, input.x, input.y, input.width, input.height);
    } else {
      ctx.drawImage(img, input.x, input.y);
    }
    
    return { success: true, data: null };
  },
};

export const appendTextAtom: Atom = {
  name: 'appendText',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'text', type: 'string', description: 'Text to append' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; text: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'appendText requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    el.textContent = (el.textContent || '') + input.text;
    return { success: true, data: null };
  },
};

export const streamTextAtom: Atom = {
  name: 'streamText',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'text', type: 'string', description: 'Text content' },
      { name: 'mode', type: 'string', description: 'append or replace (default: append)' }
    ],
    output: { type: 'string', description: 'Current full text content' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; text: string; mode?: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'streamText requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    if (input.mode === 'replace') {
      el.textContent = input.text;
    } else {
      el.textContent = (el.textContent || '') + input.text;
    }

    return { success: true, data: el.textContent };
  },
};

export const setInnerHTMLAtom: Atom = {
  name: 'setInnerHTML',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'id', type: 'string', description: 'Element ID' },
      { name: 'html', type: 'string', description: 'HTML content to set' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { id: string; html: string }, context: Context): Promise<Result> => {
    if (typeof document === 'undefined') {
      return { success: false, error: 'setInnerHTML requires browser environment' };
    }

    const el = getElement(input.id);
    if (!el) {
      return { success: false, error: `Element "${input.id}" not found` };
    }

    el.innerHTML = input.html;
    return { success: true, data: null };
  },
};
