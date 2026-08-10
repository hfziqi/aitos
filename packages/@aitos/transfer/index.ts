export * from './network';
export * from './websocket';

import { Atom } from '@aitos/core';
import {
  httpRequestAtom,
  httpStreamRequestAtom,
} from './network';
import {
  nodeConnectAtom,
  nodeSendAtom,
  nodeOnMessageAtom,
} from './websocket';

export const allAtoms: Atom[] = [
  httpRequestAtom,
  httpStreamRequestAtom,
  nodeConnectAtom,
  nodeSendAtom,
  nodeOnMessageAtom,
];
