import { compileAcs, Context } from '@aitos/core'
import { runtime } from './runtime'
import { createRootContext, createConversationContext } from './context'

async function main() {
  console.log('LinkArm starting...')

  // 1. Create root context
  const rootContext = createRootContext()
  const convContexts = new Map<string, Context>()
  rootContext.store.set('__convContexts', convContexts)

  // 2. Load all ACS graphs into root context
  const acsModules = import.meta.glob('./graphs/**/*.acs', { eager: true, query: '?raw', import: 'default' })
  for (const [path, acsText] of Object.entries(acsModules)) {
    const match = path.match(/\.\/graphs\/(.+?)\.acs/)
    if (match && typeof acsText === 'string') {
      const graphName = match[1]
      try {
        const graph = compileAcs(acsText)
        rootContext.store.set(`__graph_${graphName}`, graph)
        console.log(`Loaded graph (ACS): ${graphName}`)
      } catch (e) {
        console.error(`Failed to compile ACS ${path}:`, e)
      }
    }
  }

  // 3. Register conv context factory
  rootContext.store.set('__createConvCtx', (convId: string): Context => {
    if (!convContexts.has(convId)) {
      const ctx = createConversationContext(convId, rootContext)
      convContexts.set(convId, ctx)
    }
    return convContexts.get(convId)!
  })

  console.log('All loaded graphs:', Array.from(rootContext.store.keys()).filter(k => k.startsWith('__graph_')))

  // 4. Execute main graph (global setup: styles, container, event listeners)
  const mainGraph = rootContext.store.get('__graph_core/main')
  if (mainGraph) {
    await runtime.executeGraph(mainGraph as any, rootContext, undefined, 'core/main')
  } else {
    console.error('Main graph not found!')
  }

  // 5. Load growths and conversations
  const loadGraphsGraph = rootContext.store.get('__graph_growth/load-growths')
  if (loadGraphsGraph) {
    await runtime.executeGraph(loadGraphsGraph as any, rootContext, undefined, 'growth/load-growths')
    console.log('Generated graphs loaded')
  }

  const loadConversationsGraph = rootContext.store.get('__graph_conversations/load-conversations')
  if (loadConversationsGraph) {
    await runtime.executeGraph(loadConversationsGraph as any, rootContext, undefined, 'conversations/load-conversations')
    console.log('Conversations loaded')
  }

  // 6. Create conversation contexts for existing conversations, set first as active
  const conversations: any[] = rootContext.store.get('conversations') || []
  const convCtxFactory = rootContext.store.get('__createConvCtx') as (id: string) => Context

  let activeConvContext: Context | null = null
  for (const conv of conversations) {
    const convId = conv.id
    const ctx = convCtxFactory(convId)
    if (!activeConvContext) {
      activeConvContext = ctx
      rootContext.store.set('_activeContext', ctx)
      rootContext.store.set('currentConversationId', convId)
    }
  }

  if (!activeConvContext) {
    const defaultId = '__init'
    activeConvContext = convCtxFactory(defaultId)
    rootContext.store.set('_activeContext', activeConvContext)
    rootContext.store.set('currentConversationId', defaultId)
  }

  // 7. Initial render in active conversation context
  const renderGraph = rootContext.store.get('__graph_core/render')
  if (renderGraph && activeConvContext) {
    await runtime.executeGraph(renderGraph as any, activeConvContext, undefined, 'core/render')
  }

  // 8. Start event loop in background (non-blocking)
  const eventLoopGraph = rootContext.store.get('__graph_core/event-loop')
  if (eventLoopGraph) {
    runtime.executeGraph(eventLoopGraph as any, rootContext, undefined, 'core/event-loop')
      .catch(e => console.error('Event loop failed:', e))
  }

  // 9. Telemetry: the scheduled driver lives in the telemetry/scheduler graph (distributable); main.ts only starts it (like event-loop).
  const schedulerGraph = rootContext.store.get('__graph_telemetry/scheduler')
  if (schedulerGraph) {
    runtime.executeGraph(schedulerGraph as any, rootContext, undefined, 'telemetry/scheduler')
      .catch(e => console.error('telemetry/scheduler failed:', e))
  }

  // Flushing before page close cannot reliably run graphs; keep a direct JS fallback (infrastructure exception)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      try {
        const bridge = (window as any).__aitos_bridge__
        if (!bridge) return
        const stats = runtime.flushStats()
        bridge.writeLocal({ key: 'logs/telemetry/stats.json', value: JSON.stringify({ timestamp: Date.now(), stats }) })
        const snapshot = runtime.flushTelemetry()
        bridge.writeLocal({ key: 'logs/traces/traces.json', value: JSON.stringify({ timestamp: snapshot.timestamp, traces: snapshot.traces }) })
      } catch (e) {
        // fail silently
      }
    })
  }

  console.log('LinkArm initialized')
}

main().catch(console.error)
