import { Atom } from '@aitos/core';

export { BridgeAtom } from './BridgeAtom';
export type { FallbackHandler } from './BridgeAtom';
export * from './types';

export * from './atoms/window';
export * from './atoms/system';

import { allAtoms as bridgeAtoms } from './atoms';

export const allAtoms: Atom[] = [
  ...bridgeAtoms,
];
