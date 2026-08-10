import { Atom } from '@aitos/core';

export { BridgeAtom } from './BridgeAtom';
export type { FallbackHandler } from './BridgeAtom';
export * from './types';

export * from './atoms/window';
export * from './atoms/system';
export * from './atoms/smtp';
export * from './atoms/imap';

import { allAtoms as bridgeAtoms } from './atoms';

export const allAtoms: Atom[] = [
  ...bridgeAtoms,
];
