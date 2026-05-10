import { Atom, Context, Result } from '../types';
import { compileAcs } from '../acs';

function isGraph(obj: any): boolean {
  return obj && typeof obj === 'object' && Array.isArray(obj.order) && typeof obj.nodes === 'object';
}

export const handleToolCallsAtom: Atom = {
  name: 'handleToolCalls',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'toolCalls', type: 'array', description: 'Array of tool calls from AI response' }
    ],
    output: { type: 'array', description: 'Array of tool results' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { toolCalls: any[] }, context: Context): Promise<Result> => {
    if (!input.toolCalls || input.toolCalls.length === 0) {
      return { success: true, data: [] };
    }

    const results: any[] = [];

    for (const toolCall of input.toolCalls) {
      const toolName = toolCall.function?.name;
      let toolArgs: any = {};

      try {
        if (toolCall.function?.arguments) {
          toolArgs = JSON.parse(toolCall.function.arguments);
        }
      } catch (e) {
        results.push({
          toolCallId: toolCall.id,
          name: toolName,
          result: JSON.stringify({ error: 'Failed to parse arguments' })
        });
        continue;
      }

      let result: any;

      if (toolName === 'getSkillSet') {
        if (context.runtime) {
          result = JSON.parse(context.runtime.getSkillSet());
        } else {
          result = { error: 'Runtime not available' };
        }
      } else {
        const atom = context.runtime?.listAtoms().find(a => a.name === toolName);
        if (atom) {
          try {
            const execResult = await atom.execute(toolArgs, context);
            result = execResult.success ? execResult.data : { error: execResult.error };
          } catch (e) {
            result = { error: `Execution failed: ${e}` };
          }
        } else {
          const toolToGraphMap: Record<string, string> = {
            'save-growth': 'growth/save-growth',
            'get-growth-log': 'growth/get-growth-log',
            'analyze-telemetry': 'telemetry/analyze',
          };
          const graphKey = toolToGraphMap[toolName] || toolName;
          const graphSource = context.store.get(`__graph_${graphKey}`);
          if (graphSource && context.executeGraph && context.runtime) {
            try {
              for (const [key, value] of Object.entries(toolArgs)) {
                context.store.set(key, value);
              }

              let graph: any;
              if (typeof graphSource === 'string') {
                graph = compileAcs(graphSource);
              } else if (isGraph(graphSource)) {
                graph = graphSource;
              } else {
                result = { error: `Graph "${toolName}" has invalid format` };
                results.push({ toolCallId: toolCall.id, name: toolName, result: JSON.stringify(result) });
                continue;
              }

              const graphResults = await context.runtime.executeGraph(graph, context, undefined, graphKey);
              const lastNodeId = graph.order[graph.order.length - 1];
              result = graphResults[lastNodeId];
            } catch (e: any) {
              result = { error: `Graph execution failed: ${e.message}` };
            }
          } else {
            result = { error: `Unknown tool: ${toolName}` };
          }
        }
      }

      results.push({
        toolCallId: toolCall.id,
        name: toolName,
        result: JSON.stringify(result)
      });
    }

    return { success: true, data: results };
  },
};
