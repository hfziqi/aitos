import { Atom, Context, Result } from '../types';

export const listToolsAtom: Atom = {
  name: 'listTools',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'array', description: 'Array of registered tool names' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: {}, context: Context): Promise<Result> => {
    const toolKeys: string[] = [];
    for (const key of context.store.keys()) {
      if (key.startsWith('tool_')) {
        toolKeys.push(key.substring(5));
      }
    }
    return { success: true, data: toolKeys };
  },
};

export const registerToolAtom: Atom = {
  name: 'registerTool',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'toolName', type: 'string', description: 'Tool name' },
      { name: 'toolGraph', type: 'object', description: 'Graph JSON with order and nodes' }
    ],
    output: { type: 'object', description: 'Registration result' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { toolName: string; toolGraph: any }, context: Context): Promise<Result> => {
    const { toolName, toolGraph } = input;
    
    if (!toolName) {
      return { success: false, error: 'Missing toolName' };
    }
    if (!toolGraph) {
      return { success: false, error: 'Missing toolGraph' };
    }
    
    context.store.set(`tool_${toolName}`, toolGraph);
    return { success: true, data: { toolName } };
  },
};

export const executeToolAtom: Atom = {
  name: 'executeTool',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'toolName', type: 'string', description: 'Tool name to execute' }
    ],
    output: { type: 'any', description: 'Tool execution result' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { toolName: string }, context: Context): Promise<Result> => {
    const { toolName } = input;
    
    if (!toolName) {
      return { success: false, error: 'Missing toolName' };
    }
    
    const graph = context.store.get(`tool_${toolName}`);
    
    if (!graph) {
      return { success: false, error: `Tool "${toolName}" not found` };
    }
    
    if (!context.executeGraph) {
      return { success: false, error: 'executeGraph not available' };
    }
    
    try {
      const graphResults = await context.executeGraph(graph, context.currentScope);
      const lastNodeId = graph.order[graph.order.length - 1];
      return { success: true, data: graphResults[lastNodeId] };
    } catch (e) {
      return { success: false, error: `Execution failed: ${e}` };
    }
  },
};

export const handleToolCallsAtom: Atom = {
  name: 'handleToolCalls',
  version: '3.0.0',
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
      } else if (context.runtime) {
        const atom = context.runtime.listAtoms().find(a => a.name === toolName);
        if (atom) {
          try {
            const execResult = await atom.execute(toolArgs, context);
            result = execResult.success ? execResult.data : { error: execResult.error };
          } catch (e) {
            result = { error: `Execution failed: ${e}` };
          }
        } else {
          result = { error: `Unknown atom: ${toolName}` };
        }
      } else {
        result = { error: 'Runtime not available' };
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
