import { AitosRuntime, Atom } from '@aitos/core'
import { allAtoms as coreAtoms } from '@aitos/core'
import { allAtoms as outputAtoms } from '@aitos/output'
import { allAtoms as inputAtoms } from '@aitos/input'
import { allAtoms as storeAtoms } from '@aitos/store'
import { allAtoms as transferAtoms } from '@aitos/transfer'
import { allAtoms as senseAtoms } from '@aitos/sense'
import { allAtoms as bridgeAtoms } from '@aitos/bridge-desktop'

const runtime = new AitosRuntime()

const allAtoms: Atom[] = [
  ...coreAtoms,
  ...outputAtoms,
  ...inputAtoms,
  ...storeAtoms,
  ...transferAtoms,
  ...senseAtoms,
  ...bridgeAtoms,
]

allAtoms.forEach(atom => runtime.register(atom))

runtime.onSnapshot((snapshot) => {
  if (typeof window !== 'undefined' && (window as any).__aitos_bridge__) {
    try {
      (window as any).__aitos_bridge__.writeLocal({
        key: 'logs/telemetry/history.json',
        value: JSON.stringify(snapshot)
      })
    } catch (e) {
      // 静默失败
    }
  }
})

export { runtime, allAtoms }
