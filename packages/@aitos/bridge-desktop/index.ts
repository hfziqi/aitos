import { Atom } from '@aitos/core';

import { allAtoms as coreBridgeAtoms } from '@aitos/bridge';

export * from '@aitos/bridge';

export * from './file';
export * from './exec';

import { readLocalAtom, writeLocalAtom, listLocalAtom, removeLocalAtom } from './file';
import { execCommandAtom } from './exec';

export const desktopAtoms: Atom[] = [
  readLocalAtom,
  writeLocalAtom,
  listLocalAtom,
  removeLocalAtom,
  execCommandAtom,
];

export const allAtoms: Atom[] = [
  ...coreBridgeAtoms,
  ...desktopAtoms,
];
