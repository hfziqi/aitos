export * from './network';

import { Atom } from '@aitos/core';
import {
  httpRequestAtom,
  httpStreamRequestAtom,
} from './network';

export const allAtoms: Atom[] = [
  httpRequestAtom,
  httpStreamRequestAtom,
];
