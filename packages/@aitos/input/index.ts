export * from './pointer';
export * from './keyboard';
export * from './interact';

import { Atom } from 'aitos';
import {
  getMousePositionAtom,
  getTouchAtom,
  addEventListenerAtom,
  removeEventListenerAtom,
} from './pointer';
import {
  getKeyAtom,
} from './keyboard';
import {
  showFilePickerAtom,
  readFileAtom,
} from './interact';

export const allAtoms: Atom[] = [
  getMousePositionAtom,
  getTouchAtom,
  addEventListenerAtom,
  removeEventListenerAtom,
  getKeyAtom,
  showFilePickerAtom,
  readFileAtom,
];
