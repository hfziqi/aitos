// AITOS WebSocket connection atoms — let graphs connect to world nodes (OPEN METAVERSE CONNECTION).
//   nodeConnect(url)             → open a WebSocket to a world node, returns nodeId
//   nodeSend(nodeId, type, ...)  → send a message (enter / action / leave)
//   nodeOnMessage(nodeId, key)   → listen for node messages, split into storeKey_field keys
import { Atom, Context, Result } from '@aitos/core';

// Module-level registry of active connections (nodeId → WebSocket).
const connections = new Map<string, WebSocket>();
let nodeCounter = 0;

export const nodeConnectAtom: Atom = {
  name: 'nodeConnect',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'url', type: 'string', description: 'WebSocket URL of the world node, e.g. "ws://localhost:8080"' }
    ],
    output: { type: 'string', description: 'nodeId, used as input by nodeSend / nodeOnMessage' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { url: string }, context: Context): Promise<Result> => {
    try {
      const ws = new WebSocket(input.url);
      const nodeId = `node_${++nodeCounter}`;
      connections.set(nodeId, ws);
      // WebSocket connects asynchronously — wait for it to open before returning,
      // so the next node (nodeSend) can send immediately without failing.
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error(`cannot connect to ${input.url}`));
      });
      return { success: true, data: nodeId };
    } catch (e: any) {
      return { success: false, error: `nodeConnect failed: ${e?.message ?? e}` };
    }
  },
};

export const nodeSendAtom: Atom = {
  name: 'nodeSend',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'nodeId', type: 'string', description: 'Node id from nodeConnect' },
      { name: 'type', type: 'string', description: 'Message type: enter | action | leave' },
      { name: 'payload', type: 'object', description: 'Optional message payload fields (optional)' }
    ],
    output: { type: 'null', description: 'null on success' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { nodeId: string; type: string; payload?: any }, context: Context): Promise<Result> => {
    const ws = connections.get(input.nodeId);
    if (!ws) return { success: false, error: `node "${input.nodeId}" not connected` };
    try {
      const msg = { type: input.type, ...(input.payload ?? {}) };
      ws.send(JSON.stringify(msg));
      return { success: true, data: null };
    } catch (e: any) {
      return { success: false, error: `nodeSend failed: ${e?.message ?? e}` };
    }
  },
};

export const nodeOnMessageAtom: Atom = {
  name: 'nodeOnMessage',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'nodeId', type: 'string', description: 'Node id from nodeConnect' },
      { name: 'storeKey', type: 'string', description: 'Store key prefix; incoming messages are split into storeKey_field keys (explicit data flow)' }
    ],
    output: { type: 'null', description: 'null on success' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (input: { nodeId: string; storeKey: string }, context: Context): Promise<Result> => {
    const ws = connections.get(input.nodeId);
    if (!ws) return { success: false, error: `node "${input.nodeId}" not connected` };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        // Explicit data flow: key name IS the field name (same as addEventListener storeKey_field)
        for (const [key, value] of Object.entries(data)) {
          context.store.set(`${input.storeKey}_${key}`, value);
        }
        context.store.set(`${input.storeKey}_raw`, event.data);
      } catch (e) {
        // ignore malformed messages
      }
    };
    return { success: true, data: null };
  },
};

export const webSocketAtoms: Atom[] = [
  nodeConnectAtom,
  nodeSendAtom,
  nodeOnMessageAtom,
];
