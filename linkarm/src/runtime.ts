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

// traces：每 2 分钟自动落盘一次，按 traceChainId 分文件存储
runtime.onSnapshot(async (snapshot) => {
  if (typeof window !== 'undefined' && snapshot.traces && snapshot.traces.length > 0) {
    try {
      const bridge = (window as any).__aitos_bridge__;
      if (!bridge) return;

      const groups = new Map<string, any[]>();
      for (const entry of snapshot.traces) {
        const key = entry.traceChainId || 'uncategorized';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(entry);
      }

      for (const [chainId, entries] of groups) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileKey = `logs/traces/${chainId}/${timestamp}.json`;
        bridge.writeLocal({ key: fileKey, value: JSON.stringify(entries) });
      }
    } catch (e) {
      // fail silently
    }
  }
})

// stats：每 30 秒自动存一次（~90 条，几 KB，无感）
runtime.onStatsSnapshot((stats) => {
  if (typeof window !== 'undefined' && (window as any).__aitos_bridge__) {
    try {
      (window as any).__aitos_bridge__.writeLocal({
        key: 'logs/telemetry/stats.json',
        value: JSON.stringify({ timestamp: Date.now(), stats })
      });
    } catch (e) {
      // fail silently
    }
  }
})
setInterval(() => runtime.flushStats(), 30000)

// traces：每 2 分钟自动落盘一次，防止内存膨胀
setInterval(() => runtime.flushTelemetry(), 120000)

// 关闭页面前存所有
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
  runtime.flushTelemetry()
  runtime.flushStats()
})
}

export { runtime, allAtoms }