import { Atom, Context, Result, Graph, GraphNode, Scope, AtomRegistry, GraphValidationError, GraphSuggestion, Runtime, TelemetryStats, TelemetrySnapshot } from './types';

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

class TelemetryStore {
  private atoms: Map<string, {
    count: number;
    totalDuration: number;
    maxDuration: number;
    errorCount: number;
    lastCalled: number;
    graphs: Set<string>;
  }> = new Map();

  record(atom: string, graphName: string, duration: number, success: boolean): void {
    let entry = this.atoms.get(atom);
    if (!entry) {
      entry = { count: 0, totalDuration: 0, maxDuration: 0, errorCount: 0, lastCalled: 0, graphs: new Set() };
      this.atoms.set(atom, entry);
    }
    entry.count++;
    entry.totalDuration += duration;
    if (duration > entry.maxDuration) entry.maxDuration = duration;
    if (!success) entry.errorCount++;
    entry.lastCalled = Date.now();
    entry.graphs.add(graphName);
  }

  getStats(): TelemetryStats[] {
    const result: TelemetryStats[] = [];
    for (const [atom, data] of this.atoms) {
      result.push({
        atom,
        count: data.count,
        avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
        maxDuration: data.maxDuration,
        errorCount: data.errorCount,
        errorRate: data.count > 0 ? Math.round((data.errorCount / data.count) * 10000) / 100 : 0,
        lastCalled: data.lastCalled,
        graphs: Array.from(data.graphs),
      });
    }
    result.sort((a, b) => b.count - a.count);
    return result;
  }

  reset(): void {
    this.atoms.clear();
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
  private telemetryStore: TelemetryStore = new TelemetryStore();
  private telemetryHistory: TelemetrySnapshot[] = [];
  private snapshotCallback?: (snapshot: TelemetrySnapshot) => void;

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

  private validateGraphNodes(nodes: Record<string, GraphNode>, order: string[], errors: GraphValidationError[], path: string = '', parentExecuted?: Set<string>): void {
    const executed = parentExecuted ? new Set(parentExecuted) : new Set<string>();

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
          this.validateGraphNodes(subGraph.nodes, subGraph.order, errors, `${nodePath}.nodes`, executed);
        }
      }
      if (node.then && typeof node.then === 'object' && 'order' in node.then) {
        const subGraph = node.then as Graph;
        if (subGraph.nodes && subGraph.order) {
          this.validateGraphNodes(subGraph.nodes, subGraph.order, errors, `${nodePath}.then`, executed);
        }
      }
      if (node.else && typeof node.else === 'object' && 'order' in node.else) {
        const subGraph = node.else as Graph;
        if (subGraph.nodes && subGraph.order) {
          this.validateGraphNodes(subGraph.nodes, subGraph.order, errors, `${nodePath}.else`, executed);
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

  async executeGraph(graph: Graph, context: Context, outerScope?: Record<string, any>, graphName?: string): Promise<Record<string, any>> {
    const results: Record<string, any> = outerScope ? { ...outerScope } : {};
    const gName = graphName || 'unknown';
    
    const previousScope = context.currentScope;
    context.currentScope = results;
    context.runtime = this;

    for (const nodeId of graph.order) {
      const node = graph.nodes[nodeId];
      const input = this.resolveGraphInput(node, results, context);
      const startTime = performance.now();
      const result = await context.execute(node.atom, input);
      const duration = Math.round(performance.now() - startTime);

      this.telemetryStore.record(node.atom, gName, duration, result.success);

      if (!result.success) {
        context.currentScope = previousScope;
        throw new Error(JSON.stringify({ node: nodeId, atom: node.atom, error: result.error }));
      }

      results[nodeId] = result.data;
    }

    context.currentScope = previousScope;

    return results;
  }

  onSnapshot(callback: (snapshot: TelemetrySnapshot) => void): void {
    this.snapshotCallback = callback;
  }

  flushTelemetry(): TelemetrySnapshot {
    const stats = this.telemetryStore.getStats();
    const snapshot: TelemetrySnapshot = { timestamp: Date.now(), stats };
    this.telemetryHistory.push(snapshot);
    if (this.telemetryHistory.length > 100) {
      this.telemetryHistory.shift();
    }
    this.snapshotCallback?.(snapshot);
    return snapshot;
  }

  getTelemetryHistory(): TelemetrySnapshot[] {
    return this.telemetryHistory;
  }

  restoreTelemetryHistory(history: TelemetrySnapshot[]): void {
    this.telemetryHistory = history.slice(-100);
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
      const ESCAPE_PLACEHOLDER = '\x00ESCAPED_BRACE\x00';
      let processedValue = value.replace(/\\{{/g, ESCAPE_PLACEHOLDER);

      const match = processedValue.match(/^\{\{(\w+)(?:\.(.+?))?\}\}$/);
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

      const result = processedValue.replace(/\{\{(\w+)(?:\.(.+?))?\}\}/g, (_, nodeId, field) => {
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

      return result.replace(new RegExp(ESCAPE_PLACEHOLDER, 'g'), '{{');
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
        version: '1.0.0',
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

  getTelemetryStats(): TelemetryStats[] {
    return this.telemetryStore.getStats();
  }

  resetTelemetry(): void {
    this.telemetryStore.reset();
  }
}

export { Store, AtomRegistryImpl, TelemetryStore };
export type { Atom, Context, Result, Graph, GraphNode, Scope, AtomRegistry, GraphValidationError, GraphSuggestion, Runtime, TelemetryStats, TelemetrySnapshot };
