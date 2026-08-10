import { AitosRuntime, Atom, Context, Result } from '@aitos/core'
import { allAtoms as coreAtoms } from '@aitos/core'
import { allAtoms as outputAtoms } from '@aitos/output'
import { allAtoms as inputAtoms } from '@aitos/input'
import { allAtoms as storeAtoms } from '@aitos/store'
import { allAtoms as transferAtoms } from '@aitos/transfer'
import { allAtoms as senseAtoms } from '@aitos/sense'
import { allAtoms as bridgeAtoms } from '@aitos/bridge-desktop'

const runtime = new AitosRuntime()

export const createConversationContextAtom: Atom = {
  name: 'createConversationContext',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'convId', type: 'string', description: 'Conversation ID to create/lookup context for' }
    ],
    output: { type: 'object', description: 'The created or existing conversation context' }
  },
  characteristics: { stateless: false, atomic: true, composable: false },
  execute: async (input: { convId: string }, context: Context): Promise<Result> => {
    if (!input.convId) return { success: false, error: 'convId is required' }

    const createFn = context.store.get('__createConvCtx')
    if (typeof createFn !== 'function') {
      return { success: false, error: 'Context factory not available in store' }
    }

    try {
      const convCtx = createFn(input.convId)
      return { success: true, data: convCtx }
    } catch (e: any) {
      return { success: false, error: `Failed to create conversation context: ${e.message}` }
    }
  },
}

const allAtomsArray: Atom[] = [
  ...coreAtoms,
  ...outputAtoms,
  ...inputAtoms,
  ...storeAtoms,
  ...transferAtoms,
  ...senseAtoms,
  ...bridgeAtoms,
  createConversationContextAtom,
]

const allAtoms = new Map<string, Atom>()
allAtomsArray.forEach(atom => {
  allAtoms.set(atom.name, atom)
  runtime.register(atom)
})

export { runtime, allAtoms }
