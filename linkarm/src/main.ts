import { runtime } from './runtime'
import { createContext } from './context'
import { compileAcs } from 'aitos'

async function main() {
  console.log('LinkArm starting...')

  const context = createContext()

  const acsModules = import.meta.glob('./graphs/**/*.acs', { eager: true, query: '?raw', import: 'default' })

  for (const [path, acsText] of Object.entries(acsModules)) {
    const match = path.match(/\.\/graphs\/(.+?)\.acs/)
    if (match && typeof acsText === 'string') {
      const graphName = match[1]
      try {
        const graph = compileAcs(acsText)
        context.store.set(`__graph_${graphName}`, graph)
        console.log(`Loaded graph (ACS): ${graphName}`)
      } catch (e) {
        console.error(`Failed to compile ACS ${path}:`, e)
      }
    }
  }

  console.log('All loaded graphs:', Array.from(context.store.keys()).filter(k => k.startsWith('__graph_')))

  const mainGraph = context.store.get('__graph_core/main')
  if (mainGraph) {
    await runtime.executeGraph(mainGraph as any, context)
  } else {
    console.error('Main graph not found!')
  }

  const loadGraphsGraph = context.store.get('__graph_core/load-graphs')
  if (loadGraphsGraph) {
    await runtime.executeGraph(loadGraphsGraph as any, context)
    console.log('Generated graphs loaded')
  }

  const loadConversationsGraph = context.store.get('__graph_core/load-conversations')
  if (loadConversationsGraph) {
    await runtime.executeGraph(loadConversationsGraph as any, context)
    console.log('Conversations loaded')
  }

  console.log('LinkArm initialized')
}

main().catch(console.error)
