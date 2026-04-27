export * from './local';
export * from './graph';

import { Atom } from 'aitos';
import {
  getItemAtom,
  setItemAtom,
  removeItemAtom,
  clearStorageAtom,
  getKeysAtom,
} from './local';

import { getGraphListAtom } from './graph';

export const allAtoms: Atom[] = [
  getItemAtom,
  setItemAtom,
  removeItemAtom,
  clearStorageAtom,
  getKeysAtom,
  getGraphListAtom,
];
