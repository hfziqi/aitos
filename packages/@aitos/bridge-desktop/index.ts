import { Atom } from '@aitos/core';

import { allAtoms as coreBridgeAtoms } from '@aitos/bridge';

export * from '@aitos/bridge';

export * from './file';
export * from './exec';
export * from './zip';

import { readLocalAtom, writeLocalAtom, listLocalAtom, removeLocalAtom } from './file';
import { execCommandAtom } from './exec';
import { readZipFileAtom } from './zip';

export const desktopAtoms: Atom[] = [
  readLocalAtom,
  writeLocalAtom,
  listLocalAtom,
  removeLocalAtom,
  execCommandAtom,
  readZipFileAtom,
];

export const allAtoms: Atom[] = [
  ...coreBridgeAtoms,
  ...desktopAtoms,
];
