// AITOS 3D atoms — bridge between ACS graphs and the host 3D engine (window.__aitos_3d__).
// The 3D engine itself is a host capability (like the shell/WebView2): the host exposes
// an engine object on window.__aitos_3d__, and these atoms command / query it.
//   Output class (graph -> engine): create3DScene, create3DObject, set3DPosition, set3DRotation, set3DAnimation
//   Perception class (engine -> graph): get3DPosition, get3DProximity
import { Atom } from '@aitos/core';
import { Aitos3DEngine } from './engine-contract';

// Returns the host 3D engine bridge, or null if not available (engine not loaded).
function getEngine(): Aitos3DEngine | null {
  if (typeof window === 'undefined') return null;
  return window.__aitos_3d__ ?? null;
}

function engineError(msg: string): { success: false; error: string } {
  return { success: false, error: `3D engine unavailable: ${msg}` };
}

export const create3DSceneAtom: Atom = {
  name: 'create3DScene',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'canvasId', type: 'string', description: 'DOM id of the canvas element to render into' }
    ],
    output: { type: 'string', description: 'Scene id, used as input by create3DObject / set3D* atoms' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { canvasId: string }, context: any): Promise<any> => {
    const engine = getEngine();
    if (!engine?.createScene) return engineError('createScene not available');
    try {
      const sceneId = engine.createScene(input.canvasId);
      return { success: true, data: sceneId };
    } catch (e: any) {
      return { success: false, error: `create3DScene failed: ${e?.message ?? e}` };
    }
  },
};

export const create3DObjectAtom: Atom = {
  name: 'create3DObject',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'scene', type: 'string', description: 'Scene id from create3DScene' },
      { name: 'geometry', type: 'string', description: 'Geometry type: box | sphere | cone | cylinder | torus' },
      { name: 'size', type: 'number or object', description: 'Equal-sided scale (number) or { x, y, z } width/height/depth for non-equal shapes like walls (optional, default 1)' },
      { name: 'name', type: 'string', description: 'Stable name (content-defined identity, used for cross-client sync alignment); optional, default engine-generated id' }
    ],
    output: { type: 'string', description: 'Object id (the name if given, else engine-generated); uncolored grey, color applied via set3DColor' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { scene: string; geometry: string; size?: number | { x: number; y: number; z: number }; name?: string }, context: any): Promise<any> => {
    const engine = getEngine();
    if (!engine?.createObject) return engineError('createObject not available');
    try {
      const objectId = engine.createObject(input.scene, input.geometry, input.size ?? 1, input.name);
      return { success: true, data: objectId };
    } catch (e: any) {
      return { success: false, error: `create3DObject failed: ${e?.message ?? e}` };
    }
  },
};

export const set3DColorAtom: Atom = {
  name: 'set3DColor',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'object', type: 'string', description: 'Object id from create3DObject' },
      { name: 'color', type: 'string', description: 'Material color, e.g. "#e8d5a3"' }
    ],
    output: { type: 'null', description: 'null on success' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { object: string; color: string }, context: any): Promise<any> => {
    const engine = getEngine();
    if (!engine?.setColor) return engineError('setColor not available');
    try {
      engine.setColor(input.object, input.color);
      return { success: true, data: null };
    } catch (e: any) {
      return { success: false, error: `set3DColor failed: ${e?.message ?? e}` };
    }
  },
};

export const set3DPositionAtom: Atom = {
  name: 'set3DPosition',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'object', type: 'string', description: 'Object id from create3DObject' },
      { name: 'x', type: 'number', description: 'X coordinate' },
      { name: 'y', type: 'number', description: 'Y coordinate' },
      { name: 'z', type: 'number', description: 'Z coordinate' }
    ],
    output: { type: 'null', description: 'null on success' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { object: string; x: number; y: number; z: number }, context: any): Promise<any> => {
    const engine = getEngine();
    if (!engine?.setPosition) return engineError('setPosition not available');
    try {
      engine.setPosition(input.object, input.x, input.y, input.z);
      return { success: true, data: null };
    } catch (e: any) {
      return { success: false, error: `set3DPosition failed: ${e?.message ?? e}` };
    }
  },
};

export const set3DRotationAtom: Atom = {
  name: 'set3DRotation',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'object', type: 'string', description: 'Object id from create3DObject' },
      { name: 'x', type: 'number', description: 'Rotation around X axis in radians (optional, default 0)' },
      { name: 'y', type: 'number', description: 'Rotation around Y axis in radians (optional, default 0)' },
      { name: 'z', type: 'number', description: 'Rotation around Z axis in radians (optional, default 0)' }
    ],
    output: { type: 'null', description: 'null on success' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { object: string; x?: number; y?: number; z?: number }, context: any): Promise<any> => {
    const engine = getEngine();
    if (!engine?.setRotation) return engineError('setRotation not available');
    try {
      engine.setRotation(input.object, input.x ?? 0, input.y ?? 0, input.z ?? 0);
      return { success: true, data: null };
    } catch (e: any) {
      return { success: false, error: `set3DRotation failed: ${e?.message ?? e}` };
    }
  },
};

export const set3DAnimationAtom: Atom = {
  name: 'set3DAnimation',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'object', type: 'string', description: 'Object id from create3DObject' },
      { name: 'type', type: 'string', description: 'Animation type: rotate | none (default rotate)' },
      { name: 'speed', type: 'number', description: 'Rotation speed in radians per frame (optional, default 0.01)' }
    ],
    output: { type: 'null', description: 'null on success' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { object: string; type?: string; speed?: number }, context: any): Promise<any> => {
    const engine = getEngine();
    if (!engine?.setAnimation) return engineError('setAnimation not available');
    try {
      engine.setAnimation(input.object, input.type ?? 'rotate', input.speed ?? 0.01);
      return { success: true, data: null };
    } catch (e: any) {
      return { success: false, error: `set3DAnimation failed: ${e?.message ?? e}` };
    }
  },
};

export const get3DPositionAtom: Atom = {
  name: 'get3DPosition',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'object', type: 'string', description: 'Object id from create3DObject' }
    ],
    output: { type: 'object', description: '{ x, y, z } position of the object' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { object: string }, context: any): Promise<any> => {
    const engine = getEngine();
    if (!engine?.getPosition) return engineError('getPosition not available');
    try {
      const pos = engine.getPosition(input.object);
      return { success: true, data: pos };
    } catch (e: any) {
      return { success: false, error: `get3DPosition failed: ${e?.message ?? e}` };
    }
  },
};

export const get3DProximityAtom: Atom = {
  name: 'get3DProximity',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'object', type: 'string', description: 'First object id from create3DObject' },
      { name: 'other', type: 'string', description: 'Second object id from create3DObject' },
      { name: 'threshold', type: 'number', description: 'Distance threshold in world units (optional, default 2)' }
    ],
    output: { type: 'boolean', description: 'true if the two objects are within threshold distance' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { object: string; other: string; threshold?: number }, context: any): Promise<any> => {
    const engine = getEngine();
    if (!engine?.getProximity) return engineError('getProximity not available');
    try {
      const near = engine.getProximity(input.object, input.other, input.threshold ?? 2);
      return { success: true, data: near };
    } catch (e: any) {
      return { success: false, error: `get3DProximity failed: ${e?.message ?? e}` };
    }
  },
};

export const threeDAtoms: Atom[] = [
  create3DSceneAtom,
  create3DObjectAtom,
  set3DColorAtom,
  set3DPositionAtom,
  set3DRotationAtom,
  set3DAnimationAtom,
  get3DPositionAtom,
  get3DProximityAtom,
];
