export * from './motion';

import { Atom } from 'aitos';
import {
  getAccelerometerAtom,
  getGyroscopeAtom,
  getLocationAtom,
  getBatteryAtom,
  getNetworkStatusAtom,
} from './motion';

export const allAtoms: Atom[] = [
  getAccelerometerAtom,
  getGyroscopeAtom,
  getLocationAtom,
  getBatteryAtom,
  getNetworkStatusAtom,
];
