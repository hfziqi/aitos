export * from './window';
export * from './system';
export * from './smtp';
export * from './imap';

import { windowAtoms } from './window';
import { systemAtoms } from './system';
import { smtpSendAtom } from './smtp';
import { imapFetchAtom } from './imap';
import { Atom } from '@aitos/core';

export const allAtoms: Atom[] = [
  ...windowAtoms,
  ...systemAtoms,
  smtpSendAtom,
  imapFetchAtom,
];
