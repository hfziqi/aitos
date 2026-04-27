import { Atom, Context, Result, Graph, GraphNode, Scope, AtomRegistry, GraphValidationError, GraphSuggestion, Runtime } from './types';

class Store {
  private data: Map<string, any> = new Map();

  get(key: string): any {
    return this.data.get(key);
  }

  set(key: string, value: any): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

class AtomRegistryImpl implements AtomRegistry {
  private atoms: Map<string, Atom> = new Map();

  register(atom: Atom): void {
    const key = `${atom.name}@${atom.version}`;
    this.atoms.set(key, atom);
    this.atoms.set(atom.name, atom);
  }

  get(name: string): Atom | undefined {
    return this.atoms.get(name);
  }

  has(name: string): boolean {
    return this.atoms.has(name);
  }

  list(): string[] {
    const result: string[] = [];
    const seen = new Set<string>();
    
    for (const [key, atom] of this.atoms.entries()) {
      if (!seen.has(atom.name)) {
        seen.add(atom.name);
        result.push(atom.name);
      }
    }
    
    return result;
  }
}

export class AitosRuntime implements Runtime {
  private atoms: Map<string, Atom> = new Map();

  register(atom: Atom): void {
    const key = `${atom.name}@${atom.version}`;
    this.atoms.set(key, atom);
    this.atoms.set(atom.name, atom);
  }

  validateGraph(graph: Graph): { valid: boolean; errors: string[] } {
    const errors: GraphValidationError[] = [];
    this.validateGraphNodes(graph.nodes, graph.order, errors);
    return { valid: errors.length === 0, errors: errors.map(e => JSON.stringify(e)) };
  }

  private validateGraphNodes(nodes: Record<string, GraphNode>, order: string[], errors: GraphValidationError[], path: string = ''): void {
    const executed = new Set<string>();

    for (const nodeId of order) {
      const node = nodes[nodeId];
      if (!node) {
        errors.push({
          node: path,
          code: 'NODE_NOT_FOUND',
          param: '',
          ref: nodeId,
          message: `Node "${nodeId}" not found in nodes`
        });
        continue;
      }

      const nodePath = path ? `${path}.${nodeId}` : nodeId;

      if (!node.atom) {
        errors.push({ node: nodePath, code: 'MISSING_ATOM', param: '', ref: '', message: 'Missing atom field' });
        continue;
      }

      if (typeof node.atom !== 'string') {
        errors.push({ node: nodePath, code: 'INVALID_ATOM_TYPE', param: '', ref: '', message: 'Atom must be a string' });
        continue;
      }

      if (!this.atoms.has(node.atom)) {
        errors.push({ node: nodePath, code: 'ATOM_NOT_FOUND', param: '', ref: '', message: `Atom "${node.atom}" not registered` });
      }

      this.validateGraphReferences(node, executed, errors, nodePath, nodes);

      if (node.nodes && typeof node.nodes === 'object' && 'order' in node.nodes) {
        const subGraph = node.nodes as Graph;
        if (subGraph.nodes && subGraph.order) {
          this.validateGraphNodes(subGraph.nodes, subGraph.order, errors, `${nodePath}.nodes`);
        }
      }
      if (node.then && typeof node.then === 'object' && 'order' in node.then) {
        const subGraph = node.then as Graph;
        if (subGraph.nodes && subGraph.order) {
          this.validateGraphNodes(subGraph.nodes, subGraph.order, errors, `${nodePath}.then`);
        }
      }
      if (node.else && typeof node.else === 'object' && 'order' in node.else) {
        const subGraph = node.else as Graph;
        if (subGraph.nodes && subGraph.order) {
          this.validateGraphNodes(subGraph.nodes, subGraph.order, errors, `${nodePath}.else`);
        }
      }

      executed.add(nodeId);
    }
  }

  private validateGraphReferences(node: GraphNode, executed: Set<string>, errors: GraphValidationError[], nodePath: string, nodes: Record<string, GraphNode>): void {
    for (const [key, value] of Object.entries(node)) {
      if (['atom', 'nodes', 'then', 'else'].includes(key)) continue;

      if (typeof value === 'string') {
        const matches = value.matchAll(/\{\{(\w+)(?:\.(.+?))?\}\}/g);
        for (const match of matches) {
          const refId = match[1];
          if (!executed.has(refId) && !nodes[refId]) {
            const suggestions = this.generateGraphSuggestions(executed, nodes);
            errors.push({
              node: nodePath,
              code: 'INVALID_REFERENCE',
              param: key,
              ref: refId,
              message: `Invalid reference {{${refId}}}: node not found or not yet executed`,
              suggestions
            });
          }
        }
      }
    }
  }

  private generateGraphSuggestions(executed: Set<string>, nodes: Record<string, GraphNode>): GraphSuggestion[] {
    const suggestions: GraphSuggestion[] = [];

    for (const nodeId of executed) {
      if (suggestions.length >= 5) break;
      const node = nodes[nodeId];
      if (node) {
        const atom = this.atoms.get(node.atom);
        suggestions.push({
          id: nodeId,
          type: atom?.meta.output.type || 'unknown',
          source: node.atom
        });
      }
    }

    return suggestions;
  }

  async executeGraph(graph: Graph, context: Context, outerScope?: Record<string, any>): Promise<Record<string, any>> {
    const results: Record<string, any> = outerScope ? { ...outerScope } : {};
    
    const previousScope = context.currentScope;
    context.currentScope = results;
    context.runtime = this;

    for (const nodeId of graph.order) {
      const node = graph.nodes[nodeId];
      const input = this.resolveGraphInput(node, results, context);
      const result = await context.execute(node.atom, input);

      if (!result.success) {
        context.currentScope = previousScope;
        throw new Error(JSON.stringify({ node: nodeId, atom: node.atom, error: result.error }));
      }

      results[nodeId] = result.data;
    }

    context.currentScope = previousScope;
    return results;
  }

  private resolveGraphInput(node: GraphNode, results: Record<string, any>, context: Context): any {
    const resolved: any = {};
    const SUBGRAPH_KEYS = new Set(['nodes', 'then', 'else']);

    for (const [key, value] of Object.entries(node)) {
      if (key === 'atom') continue;
      if (SUBGRAPH_KEYS.has(key)) {
        resolved[key] = value;
      } else {
        resolved[key] = this.resolveGraphValue(value, results, context);
      }
    }

    return resolved;
  }

  private resolveGraphValue(value: any, results: Record<string, any>, context: Context): any {
    if (typeof value === 'string') {
      const match = value.match(/^\{\{(\w+)(?:\.(.+?))?\}\}$/);
      if (match) {
        const nodeId = match[1];
        const field = match[2];

        let resolvedValue: any;
        
        if (nodeId in results) {
          resolvedValue = results[nodeId];
        } else if (context.store.has(nodeId)) {
          resolvedValue = context.store.get(nodeId);
        } else {
          throw new Error(JSON.stringify({
            code: 'REFERENCE_NOT_FOUND',
            ref: nodeId,
            message: `Reference {{${nodeId}}} not found in current scope or store`,
            availableInScope: Object.keys(results),
            availableInStore: context.store.has(nodeId) ? [nodeId] : [],
            hint: 'Check if the reference is a node output or a store value.',
            fix: `Ensure the node "${nodeId}" is executed before this reference, or use { "atom": "set", "key": "${nodeId}", "value": ... } to store the value.`
          }));
        }

        if (field) {
          return this.getFieldValue(resolvedValue, field);
        }
        return resolvedValue;
      }

      return value.replace(/\{\{(\w+)(?:\.(.+?))?\}\}/g, (_, nodeId, field) => {
        let resolvedValue: any;
        
        if (nodeId in results) {
          resolvedValue = results[nodeId];
        } else if (context.store.has(nodeId)) {
          resolvedValue = context.store.get(nodeId);
        } else {
          throw new Error(JSON.stringify({
            code: 'REFERENCE_NOT_FOUND',
            ref: nodeId,
            message: `Reference {{${nodeId}}} not found in current scope or store`,
            availableInScope: Object.keys(results),
            availableInStore: context.store.has(nodeId) ? [nodeId] : [],
            hint: 'Check if the reference is a node output or a store value.',
            fix: `Ensure the node "${nodeId}" is executed before this reference, or use { "atom": "set", "key": "${nodeId}", "value": ... } to store the value.`
          }));
        }
        if (field) {
          return this.getFieldValue(resolvedValue, field);
        }
        return resolvedValue;
      });
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveGraphValue(item, results, context));
    }

    if (typeof value === 'object' && value !== null) {
      const resolved: any = {};
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = this.resolveGraphValue(v, results, context);
      }
      return resolved;
    }

    return value;
  }

  private getFieldValue(obj: any, field: string): any {
    const parts = field.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }

    return current;
  }

  listAtoms(): Atom[] {
    const result: Atom[] = [];
    const seen = new Set<string>();

    for (const [key, atom] of this.atoms.entries()) {
      if (!seen.has(atom.name)) {
        seen.add(atom.name);
        result.push(atom);
      }
    }

    return result;
  }

  getSkillSet(): string {
    const atoms = this.listAtoms();

    const registry = {
      aitos: {
        version: '2.0.0',
        type: 'graph-instruction-set',
      },
      graph: {
        format: {
          nodes: 'Record<nodeId, GraphNode>',
          order: 'string[] (execution order)'
        },
        example: {
          nodes: {
            getY: { atom: 'get', key: 'fruitY' },
            addFive: { atom: 'add', a: '{{getY}}', b: 5 },
            saveY: { atom: 'set', key: 'fruitY', value: '{{addFive}}' }
          },
          order: ['getY', 'addFive', 'saveY']
        }
      },
      node: {
        format: { atom: 'string', '...params': 'per atom.input' },
        example: { atom: 'add', a: '{{otherNodeId}}', b: 1 }
      },
      ref: {
        format: '{{nodeId}} or {{nodeId.field}}',
        rules: [
          'Use nodeId to reference another node result',
          'nodeId must be defined in nodes and appear earlier in order',
          'Use {{nodeId.field}} to access nested properties',
          'References are resolved before execution'
        ]
      },
      atoms: atoms.map(a => ({
        name: a.name,
        version: a.version,
        input: a.meta.input,
        output: a.meta.output,
      })),
      validation: {
        description: 'Validation checks node references and atom existence',
        errorFormat: {
          node: 'Node path',
          code: 'Error code',
          param: 'Parameter name',
          ref: 'Invalid reference',
          message: 'Error description',
          suggestions: [
            { id: 'Suggested nodeId', type: 'Output type', source: 'Atom name' }
          ]
        }
      }
    };

    return JSON.stringify(registry);
  }
}

export { Store, AtomRegistryImpl };
export type { Atom, Context, Result, Graph, GraphNode, Scope, AtomRegistry, GraphValidationError, GraphSuggestion, Runtime };
