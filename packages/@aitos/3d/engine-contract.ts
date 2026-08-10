// AITOS 3D Engine Contract — the formal contract the host 3D engine must implement
// on window.__aitos_3d__. The engine is a host capability (like the shell/WebView2);
// this interface is the "interface shape" (USB-C style): atoms plug into it, and the
// host must implement it exactly. No guessing — the contract is typed and checkable.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Aitos3DEngine {
  // Create a 3D scene rendering into the given canvas DOM element. Returns a scene id.
  createScene(canvasId: string): string;
  // Create an object in the scene. geometry: box | sphere | cone | cylinder | torus.
  // size: number (equal-sided scale) OR { x, y, z } (width/height/depth, non-equal shapes
  // like walls/doors/roofs). The object is created UNCOLORED (grey) — color is applied
  // separately via setColor by a painting graph.
  // name: optional stable name (content-defined identity) — the same graph running in any
  // window produces the same name, so sync messages can align by name across clients.
  // Without name, an engine-generated id is used. Returns the object id (the name if given).
  createObject(scene: string, geometry: string, size: number | Vec3, name?: string): string;
  // Set an object's material color (used by painting graphs, decoupled from building).
  setColor(object: string, color: string): void;
  // Set an object's position in world units.
  setPosition(object: string, x: number, y: number, z: number): void;
  // Set an object's rotation in radians around each axis.
  setRotation(object: string, x: number, y: number, z: number): void;
  // Start/stop animation on an object. type: rotate | none. speed: radians per frame.
  setAnimation(object: string, type: string, speed: number): void;
  // Read an object's current position.
  getPosition(object: string): Vec3;
  // Check if two objects are within threshold distance of each other.
  getProximity(object: string, other: string, threshold: number): boolean;
}

// Expose the contract on the global window so the host can assign its engine
// implementation and atoms can consume it with full type safety.
declare global {
  interface Window {
    __aitos_3d__?: Aitos3DEngine;
  }
}

export {};
