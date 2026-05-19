import { Context, Atom } from '@aitos/core'
import { runtime, allAtoms } from './runtime'

export function createRootContext(): Context {
  const store = new Map<string, any>()

  const context: Context = {
    store: {
      get: (key: string) => store.get(key),
      set: (key: string, value: any) => { store.set(key, value) },
      setGlobal: (key: string, value: any) => { store.set(key, value) },
      has: (key: string) => store.has(key),
      delete: (key: string) => { store.delete(key) },
      clear: () => { store.clear() },
      keys: () => store.keys(),
    },

    execute: async (atomName: string, input: any) => {
      const atom = allAtoms.get(atomName)
      if (!atom) {
        return { success: false, error: `Atom "${atomName}" not found` }
      }
      return atom.execute(input, context)
    },

    executeGraph: async (graph: any, outerScope?: Record<string, any>, graphName?: string) => {
      return runtime.executeGraph(graph, context, outerScope, graphName)
    },

    currentScope: {}
  }

  return context
}

export function createConversationContext(convId: string, rootContext: Context): Context {
  const store = new Map<string, any>()
  store.set('_convId', convId)

  const context: Context = {
    store: {
      get: (key: string) => store.has(key) ? store.get(key) : rootContext.store.get(key),
      set: (key: string, value: any) => { store.set(key, value) },
      setGlobal: (key: string, value: any) => { rootContext.store.set(key, value) },
      has: (key: string) => store.has(key) || rootContext.store.has(key),
      delete: (key: string) => { store.delete(key) },
      clear: () => { store.clear() },
      keys: () => {
        const allKeys = new Set(store.keys())
        for (const k of rootContext.store.keys()) allKeys.add(k)
        return allKeys.values()
      },
    },

    execute: async (atomName: string, input: any) => {
      const atom = allAtoms.get(atomName)
      if (!atom) {
        return { success: false, error: `Atom "${atomName}" not found` }
      }
      return atom.execute(input, context)
    },

    executeGraph: async (graph: any, outerScope?: Record<string, any>, graphName?: string) => {
      return runtime.executeGraph(graph, context, outerScope, graphName)
    },

    currentScope: {}
  }

  return context
}
