import { AitosRuntime, Atom } from 'aitos'
import { allAtoms as coreAtoms } from 'aitos'
import { allAtoms as outputAtoms } from '@aitos/output'
import { allAtoms as inputAtoms } from '@aitos/input'
import { allAtoms as storeAtoms } from '@aitos/store'
import { allAtoms as transferAtoms } from '@aitos/transfer'
import { allAtoms as senseAtoms } from '@aitos/sense'

const runtime = new AitosRuntime()

const allAtoms: Atom[] = [
  ...coreAtoms,
  ...outputAtoms,
  ...inputAtoms,
  ...storeAtoms,
  ...transferAtoms,
  ...senseAtoms,
]

allAtoms.forEach(atom => runtime.register(atom))

export { runtime, allAtoms }
