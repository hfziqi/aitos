import { Atom, Context, Result } from 'aitos';

export const getGraphListAtom: Atom = {
  name: 'getGraphList',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'filter', type: 'string', description: 'Filter: all, native, generated' }
    ],
    output: { type: 'array', description: 'Array of graph metadata' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { filter?: string }, context: Context): Promise<Result> => {
    const filter = input.filter || 'all';
    const graphs: any[] = [];

    const keys = context.store.keys();
    for (const key of keys) {
      const value = context.store.get(key);
      if (key.startsWith('__graph_') && key !== '__graphRegistry') {
        const graphName = key.replace('__graph_', '');
        const isGenerated = graphName.startsWith('generated/');
        
        if (filter === 'native' && isGenerated) continue;
        if (filter === 'generated' && !isGenerated) continue;

        const graph = value as any;
        graphs.push({
          name: graphName,
          description: graph._meta?.description || '',
          category: graph._meta?.category || (isGenerated ? 'generated' : 'native'),
          type: isGenerated ? 'generated' : 'native'
        });
      }
    }

    return { success: true, data: graphs };
  },
};
