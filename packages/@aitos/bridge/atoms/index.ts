export * from './window';
export * from './system';

import { windowAtoms } from './window';
import { systemAtoms } from './system';
import { Atom } from '@aitos/core';

export const allAtoms: Atom[] = [
  ...windowAtoms,
  ...systemAtoms,
];
