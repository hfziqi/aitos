import { Context, Atom } from 'aitos'
import { runtime, allAtoms } from './runtime'

export function createContext(): Context {
  const store = new Map<string, any>()

  const context: Context = {
    store,

    execute: async (atomName: string, input: any) => {
      const atom = allAtoms.find((a: Atom) => a.name === atomName)
      if (!atom) {
        return { success: false, error: `Atom "${atomName}" not found` }
      }
      return atom.execute(input, context)
    },

    executeGraph: async (graph: any, outerScope?: Record<string, any>) => {
      return runtime.executeGraph(graph, context, outerScope)
    },

    currentScope: {}
  }

  return context
}
