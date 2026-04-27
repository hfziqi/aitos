/**
 * AITOS Compact Syntax (ACS)
 *
 * ACS is a compact representation of Graph JSON, designed for:
 * - AI generation (10-20x more compact than JSON)
 * - Human readability (for auditing AI output)
 * - Unambiguous compilation to/from Graph JSON
 *
 * Syntax:
 *   graph <name> {
 *     [mode: kernel|user]
 *     [in: <type> | <name>: <type>, ...]
 *     [out: <type>]
 *     [budget: { maxSteps: N, maxDepth: N, timeoutMs: N }]
 *     [requires: { atomName: versionRange, ... }]
 *     [imports: [ref1, ref2, ...]]
 *
 *     let <nodeId> = <atom>(<param>: <value>, ...)
 *     if <refNodeId> {
 *       <nodes...>
 *     } [else {
 *       <nodes...>
 *     }]
 *     loop [max: N] [cond: <storeKey>] {
 *       <nodes...>
 *     }
 *     forEach <itemKey> in <arrayRef> [max: N] {
 *       <nodes...>
 *     }
 *   }
 */

import { Graph, GraphNode } from './types';

interface AcsNode {
  type: 'let' | 'if' | 'loop' | 'forEach' | 'filter';
  id?: string;
  atom?: string;
  params?: Record<string, any>;
  ref?: string;
  body?: AcsNode[];
  elseBody?: AcsNode[];
  maxIterations?: number;
  condKey?: string;
  itemKey?: string;
  indexKey?: string;
  arrayRef?: string;
  maxItems?: number;
}

interface AcsGraph {
  name: string;
  mode?: 'kernel' | 'user';
  meta?: { description?: string; type?: string; category?: string; author?: string };
  input?: Array<{ name: string; type: string }>;
  output?: string;
  budget?: { maxSteps?: number; maxDepth?: number; timeoutMs?: number };
  requires?: Record<string, string>;
  imports?: Array<{ ref: string; as?: string }>;
  nodes: AcsNode[];
}

export class AcsParser {
  private pos = 0;
  private src = '';

  parse(text: string): AcsGraph {
    this.src = text.trim();
    this.pos = 0;
    return this.parseGraph();
  }

  private parseGraph(): AcsGraph {
    this.expect('graph');
    const name = this.readIdentifier();
    this.expect('{');

    const graph: AcsGraph = { name, nodes: [] };

    while (!this.peek('}') && this.pos < this.src.length) {
      this.skipWhitespaceAndComments();

      if (this.peek('mode:')) {
        this.advance(5);
        graph.mode = this.readIdentifier() as 'kernel' | 'user';
      } else if (this.peek('meta:')) {
        this.advance(5);
        graph.meta = this.parseMetaDecl();
      } else if (this.peek('in:')) {
        this.advance(3);
        graph.input = this.parseInputDecl();
      } else if (this.peek('out:')) {
        this.advance(4);
        graph.output = this.readIdentifier();
      } else if (this.peek('budget:')) {
        this.advance(7);
        graph.budget = this.parseBudgetDecl();
      } else if (this.peek('requires:')) {
        this.advance(9);
        graph.requires = this.parseRequiresDecl();
      } else if (this.peek('imports:')) {
        this.advance(8);
        graph.imports = this.parseImportsDecl();
      } else if (this.peek('let')) {
        graph.nodes.push(this.parseLet());
      } else if (this.peek('if')) {
        graph.nodes.push(this.parseIf());
      } else if (this.peek('loop')) {
        graph.nodes.push(this.parseLoop());
      } else if (this.peek('forEach')) {
        graph.nodes.push(this.parseForEach());
      } else if (this.peek('filter')) {
        graph.nodes.push(this.parseFilter());
      } else {
        throw new Error(`ACS parse error at pos ${this.pos}: unexpected "${this.src.slice(this.pos, this.pos + 20)}"`);
      }

      this.skipWhitespaceAndComments();
    }

    this.expect('}');
    return graph;
  }

  private parseLet(): AcsNode {
    this.expect('let');
    const id = this.readIdentifier();
    this.expect('=');
    this.skipWhitespaceAndComments();
    if (this.peek('if')) {
      const ifNode = this.parseIf();
      ifNode.id = id;
      return ifNode;
    }
    if (this.peek('forEach')) {
      const forEachNode = this.parseForEach();
      forEachNode.id = id;
      return forEachNode;
    }
    if (this.peek('loop')) {
      const loopNode = this.parseLoop();
      loopNode.id = id;
      return loopNode;
    }
    if (this.peek('filter')) {
      const filterNode = this.parseFilter();
      filterNode.id = id;
      return filterNode;
    }
    const atom = this.readIdentifier();
    const params = this.parseParams();
    return { type: 'let', id, atom, params };
  }

  private parseIf(): AcsNode {
    this.expect('if');
    const ref = this.readIdentifier();
    this.expect('{');
    const body = this.parseBody();
    this.expect('}');

    let elseBody: AcsNode[] | undefined;
    this.skipWhitespaceAndComments();
    if (this.peek('else')) {
      this.advance(4);
      this.expect('{');
      elseBody = this.parseBody();
      this.expect('}');
    }

    return { type: 'if', ref, body, elseBody };
  }

  private parseLoop(): AcsNode {
    this.expect('loop');
    let maxIterations: number | undefined;
    let condKey: string | undefined;

    this.skipWhitespaceAndComments();
    if (this.peek('max:')) {
      this.advance(4);
      maxIterations = this.readNumber();
    }
    this.skipWhitespaceAndComments();
    if (this.peek('cond:')) {
      this.advance(5);
      condKey = this.readString() || this.readIdentifier();
    }

    this.expect('{');
    const body = this.parseBody();
    this.expect('}');

    return { type: 'loop', maxIterations, condKey, body };
  }

  private parseForEach(): AcsNode {
    this.expect('forEach');
    const itemKey = this.readIdentifier();
    let indexKey: string | undefined;
    this.skipWhitespaceAndComments();
    if (this.peek(',')) {
      this.advance(1);
      indexKey = this.readIdentifier();
    }
    this.expect('in');
    const arrayRef = this.readIdentifier();
    let maxItems: number | undefined;

    this.skipWhitespaceAndComments();
    if (this.peek('max:')) {
      this.advance(4);
      maxItems = this.readNumber();
    }

    this.expect('{');
    const body = this.parseBody();
    this.expect('}');

    return { type: 'forEach', itemKey, indexKey, arrayRef, maxItems, body };
  }

  private parseFilter(): AcsNode {
    this.expect('filter');
    const itemKey = this.readIdentifier();
    let indexKey: string | undefined;

    this.skipWhitespaceAndComments();
    if (this.peek('index:')) {
      this.advance(6);
      indexKey = this.readIdentifier();
    }

    this.expect('in');
    const arrayRef = this.readIdentifier();

    this.expect('{');
    const body = this.parseBody();
    this.expect('}');

    return { type: 'filter', itemKey, indexKey, arrayRef, body };
  }

  private parseBody(): AcsNode[] {
    const nodes: AcsNode[] = [];
    this.skipWhitespaceAndComments();

    while (!this.peek('}') && this.pos < this.src.length) {
      if (this.peek('let')) nodes.push(this.parseLet());
      else if (this.peek('if')) nodes.push(this.parseIf());
      else if (this.peek('loop')) nodes.push(this.parseLoop());
      else if (this.peek('forEach')) nodes.push(this.parseForEach());
      else if (this.peek('filter')) nodes.push(this.parseFilter());
      else break;
      this.skipWhitespaceAndComments();
    }

    return nodes;
  }

  private parseParams(): Record<string, any> {
    if (!this.peek('(')) return {};
    this.advance(1); // skip (

    const params: Record<string, any> = {};
    while (!this.peek(')') && this.pos < this.src.length) {
      const key = this.readIdentifier();
      this.expect(':');
      const value = this.readValue();
      params[key] = value;

      this.skipWhitespaceAndComments();
      if (this.peek(',')) this.advance(1);
      this.skipWhitespaceAndComments();
    }

    this.expect(')');
    return params;
  }

  private parseInputDecl(): Array<{ name: string; type: string }> {
    if (this.peek('none')) { this.advance(4); return []; }
    const result: Array<{ name: string; type: string }> = [];
    while (!this.peek('\n') && !this.peek('}') && this.pos < this.src.length) {
      const name = this.readIdentifier();
      this.expect(':');
      const type = this.readIdentifier();
      result.push({ name, type });
      this.skipWhitespaceAndComments();
      if (this.peek(',')) this.advance(1);
      this.skipWhitespaceAndComments();
    }
    return result;
  }

  private parseMetaDecl(): { description?: string; type?: string; category?: string; author?: string } {
    this.expect('{');
    const meta: any = {};
    while (!this.peek('}') && this.pos < this.src.length) {
      const key = this.readIdentifier();
      this.expect(':');
      meta[key] = this.readString() || this.readIdentifier();
      this.skipWhitespaceAndComments();
      if (this.peek(',')) this.advance(1);
      this.skipWhitespaceAndComments();
    }
    this.expect('}');
    return meta;
  }

  private parseBudgetDecl(): { maxSteps?: number; maxDepth?: number; timeoutMs?: number } {
    this.expect('{');
    const budget: any = {};
    while (!this.peek('}') && this.pos < this.src.length) {
      const key = this.readIdentifier();
      this.expect(':');
      budget[key] = this.readNumber();
      this.skipWhitespaceAndComments();
      if (this.peek(',')) this.advance(1);
      this.skipWhitespaceAndComments();
    }
    this.expect('}');
    return budget;
  }

  private parseRequiresDecl(): Record<string, string> {
    this.expect('{');
    const req: Record<string, string> = {};
    while (!this.peek('}') && this.pos < this.src.length) {
      const key = this.readIdentifier();
      this.expect(':');
      req[key] = this.readString() || this.readIdentifier();
      this.skipWhitespaceAndComments();
      if (this.peek(',')) this.advance(1);
      this.skipWhitespaceAndComments();
    }
    this.expect('}');
    return req;
  }

  private parseImportsDecl(): Array<{ ref: string; as?: string }> {
    this.expect('[');
    const imports: Array<{ ref: string; as?: string }> = [];
    while (!this.peek(']') && this.pos < this.src.length) {
      const ref = this.readString() || this.readIdentifier();
      let as: string | undefined;
      this.skipWhitespaceAndComments();
      if (this.peek('as')) {
        this.advance(2);
        as = this.readIdentifier();
      }
      imports.push({ ref, as });
      this.skipWhitespaceAndComments();
      if (this.peek(',')) this.advance(1);
      this.skipWhitespaceAndComments();
    }
    this.expect(']');
    return imports;
  }

  private readValue(): any {
    this.skipWhitespaceAndComments();
    if (this.peek('"')) return this.readString();
    if (this.peek("'")) return this.readString();
    if (this.src[this.pos] === '-' || this.src[this.pos] >= '0' && this.src[this.pos] <= '9') return this.readNumber();
    if (this.peek('true')) { this.advance(4); return true; }
    if (this.peek('false')) { this.advance(5); return false; }
    if (this.peek('null')) { this.advance(4); return null; }
    if (this.peek('{{')) return this.readReference();
    if (this.peek('{')) return this.readObject();
    if (this.peek('[')) return this.readArray();
    return this.readIdentifier();
  }

  private readReference(): string {
    const start = this.pos;
    this.advance(2);
    const ref = this.readUntil('}}');
    this.advance(2);
    return `{{${ref}}}`;
  }

  private readObject(): Record<string, any> {
    this.expect('{');
    const obj: Record<string, any> = {};
    this.skipWhitespaceAndComments();
    while (!this.peek('}') && this.pos < this.src.length) {
      let key: string;
      if (this.peek('"') || this.peek("'")) {
        key = this.readString();
      } else {
        key = this.readIdentifier();
      }
      this.expect(':');
      const value = this.readValue();
      obj[key] = value;
      this.skipWhitespaceAndComments();
      if (this.peek(',')) this.advance(1);
      this.skipWhitespaceAndComments();
    }
    this.expect('}');
    return obj;
  }

  private readArray(): any[] {
    this.expect('[');
    const arr: any[] = [];
    this.skipWhitespaceAndComments();
    while (!this.peek(']') && this.pos < this.src.length) {
      arr.push(this.readValue());
      this.skipWhitespaceAndComments();
      if (this.peek(',')) this.advance(1);
      this.skipWhitespaceAndComments();
    }
    this.expect(']');
    return arr;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.src.length) {
      if (/\s/.test(this.src[this.pos])) { this.pos++; continue; }
      if (this.src[this.pos] === '/' && this.src[this.pos + 1] === '/') {
        while (this.pos < this.src.length && this.src[this.pos] !== '\n') this.pos++;
        continue;
      }
      break;
    }
  }

  private peek(s: string): boolean {
    return this.src.slice(this.pos, this.pos + s.length) === s;
  }

  private expect(s: string): void {
    this.skipWhitespaceAndComments();
    if (!this.peek(s)) {
      throw new Error(`ACS parse error at pos ${this.pos}: expected "${s}", got "${this.src.slice(this.pos, this.pos + 10)}"`);
    }
    this.pos += s.length;
  }

  private advance(n: number): void {
    this.pos += n;
  }

  private readIdentifier(): string {
    this.skipWhitespaceAndComments();
    let start = this.pos;
    while (this.pos < this.src.length && /[a-zA-Z0-9_@\-/.]/.test(this.src[this.pos])) this.pos++;
    if (this.pos === start) throw new Error(`ACS parse error at pos ${this.pos}: expected identifier`);
    return this.src.slice(start, this.pos);
  }

  private readNumber(): number {
    this.skipWhitespaceAndComments();
    let start = this.pos;
    if (this.src[this.pos] === '-') this.pos++;
    while (this.pos < this.src.length && /[0-9.]/.test(this.src[this.pos])) this.pos++;
    return Number(this.src.slice(start, this.pos));
  }

  private readString(): string {
    this.skipWhitespaceAndComments();
    const quote = this.src[this.pos];
    if (quote !== '"' && quote !== "'") throw new Error(`ACS parse error at pos ${this.pos}: expected string`);
    this.pos++;
    let result = '';
    while (this.pos < this.src.length && this.src[this.pos] !== quote) {
      if (this.src[this.pos] === '\\') {
        this.pos++;
        const ch = this.src[this.pos];
        if (ch === 'n') result += '\n';
        else if (ch === 't') result += '\t';
        else if (ch === 'r') result += '\r';
        else if (ch === '\\') result += '\\';
        else if (ch === quote) result += quote;
        else result += ch;
      } else {
        result += this.src[this.pos];
      }
      this.pos++;
    }
    this.pos++;
    return result;
  }

  private readUntil(end: string): string {
    let result = '';
    while (this.pos < this.src.length && !this.peek(end)) {
      result += this.src[this.pos];
      this.pos++;
    }
    return result;
  }
}

export class AcsCompiler {
  compile(acsGraph: AcsGraph): Graph {
    const graph: Graph = {
      order: [],
      nodes: {},
    };

    if (acsGraph.mode) graph.mode = acsGraph.mode;
    if (acsGraph.meta) graph._meta = acsGraph.meta;
    if (acsGraph.input && acsGraph.input.length > 0) {
      graph.interface = {
        input: acsGraph.input.map(i => ({ name: i.name, type: i.type })),
        output: { type: acsGraph.output || 'void' },
      };
    }
    if (acsGraph.budget) graph.budget = acsGraph.budget;
    if (acsGraph.requires) graph.requires = acsGraph.requires;
    if (acsGraph.imports) graph.imports = acsGraph.imports;

    this.compileNodes(acsGraph.nodes, graph);

    return graph;
  }

  private compileNodes(acsNodes: AcsNode[], graph: Graph): void {
    for (const node of acsNodes) {
      switch (node.type) {
        case 'let': {
          const graphNode: GraphNode = { atom: node.atom!, ...node.params };
          graph.order.push(node.id!);
          graph.nodes[node.id!] = graphNode;
          break;
        }
        case 'if': {
          let ifNodeId: string;
          if (node.id) {
            ifNodeId = node.id;
          } else {
            ifNodeId = `if_${node.ref}`;
            if (graph.nodes[ifNodeId]) {
              ifNodeId = `if_${node.ref}_${graph.order.length}`;
            }
          }
          const thenGraph = this.compileSubGraph(node.body || []);
          const elseGraph = node.elseBody ? this.compileSubGraph(node.elseBody) : undefined;

          const graphNode: GraphNode = {
            atom: 'branch',
            cond: `{{${node.ref}}}`,
          };
          if (thenGraph.order.length > 0 || !elseGraph) graphNode.then = thenGraph;
          if (elseGraph) graphNode.else = elseGraph;

          graph.order.push(ifNodeId);
          graph.nodes[ifNodeId] = graphNode;
          break;
        }
        case 'loop': {
          const loopNodeId = node.id || `loop_${graph.order.length}`;
          const bodyGraph = this.compileSubGraph(node.body || []);

          const graphNode: GraphNode = {
            atom: 'loop',
            nodes: bodyGraph,
          };
          if (node.maxIterations) graphNode.maxIterations = node.maxIterations;
          if (node.condKey) graphNode.condKey = node.condKey;

          graph.order.push(loopNodeId);
          graph.nodes[loopNodeId] = graphNode;
          break;
        }
        case 'forEach': {
          const feNodeId = node.id || `forEach_${graph.order.length}`;
          const bodyGraph = this.compileSubGraph(node.body || []);

          const graphNode: GraphNode = {
            atom: 'forEach',
            array: `{{${node.arrayRef}}}`,
            nodes: bodyGraph,
            itemKey: node.itemKey,
          };
          if (node.indexKey) graphNode.indexKey = node.indexKey;
          if (node.maxItems) graphNode.maxItems = node.maxItems;

          graph.order.push(feNodeId);
          graph.nodes[feNodeId] = graphNode;
          break;
        }
        case 'filter': {
          const fNodeId = node.id || `filter_${graph.order.length}`;
          const bodyGraph = this.compileSubGraph(node.body || []);

          const graphNode: GraphNode = {
            atom: 'filter',
            array: `{{${node.arrayRef}}}`,
            nodes: bodyGraph,
            itemKey: node.itemKey,
          };
          if (node.indexKey) graphNode.indexKey = node.indexKey;

          graph.order.push(fNodeId);
          graph.nodes[fNodeId] = graphNode;
          break;
        }
      }
    }
  }

  private compileSubGraph(acsNodes: AcsNode[]): Graph {
    const graph: Graph = { order: [], nodes: {} };
    this.compileNodes(acsNodes, graph);
    return graph;
  }
}

export class AcsDecompiler {
  decompile(graph: Graph, name: string = 'unnamed'): string {
    const lines: string[] = [];
    lines.push(`graph ${name} {`);

    if (graph.mode) lines.push(`  mode: ${graph.mode}`);
    if (graph._meta) {
      const parts = Object.entries(graph._meta).map(([k, v]) => `${k}: "${v}"`).join(', ');
      lines.push(`  meta: { ${parts} }`);
    }
    if (graph.interface) {
      if (graph.interface.input.length === 0) {
        lines.push(`  in: none`);
      } else {
        const inStr = graph.interface.input.map(i => `${i.name}: ${i.type}`).join(', ');
        lines.push(`  in: ${inStr}`);
      }
      lines.push(`  out: ${graph.interface.output.type}`);
    }
    if (graph.budget) {
      const parts: string[] = [];
      if (graph.budget.maxSteps) parts.push(`maxSteps: ${graph.budget.maxSteps}`);
      if (graph.budget.maxDepth) parts.push(`maxDepth: ${graph.budget.maxDepth}`);
      if (graph.budget.timeoutMs) parts.push(`timeoutMs: ${graph.budget.timeoutMs}`);
      lines.push(`  budget: { ${parts.join(', ')} }`);
    }
    if (graph.requires) {
      const parts = Object.entries(graph.requires).map(([k, v]) => `${k}: "${v}"`);
      lines.push(`  requires: { ${parts.join(', ')} }`);
    }
    if (graph.imports) {
      const parts = graph.imports.map(i => i.as ? `"${i.ref}" as ${i.as}` : `"${i.ref}"`);
      lines.push(`  imports: [ ${parts.join(', ')} ]`);
    }

    lines.push('');
    for (const nodeId of graph.order) {
      const node = graph.nodes[nodeId];
      lines.push(...this.decompileNode(nodeId, node, 1));
    }

    lines.push('}');
    return lines.join('\n');
  }

  private decompileNode(nodeId: string, node: GraphNode, indent: number): string[] {
    const prefix = '  '.repeat(indent);
    const lines: string[] = [];

    if (node.atom === 'branch') {
      const condRef = this.extractCondRef(node.cond);
      const isNamedIf = nodeId && !nodeId.startsWith('if_');
      const ifPrefix = isNamedIf ? `${prefix}let ${nodeId} = ` : '';
      lines.push(`${ifPrefix}if ${condRef || nodeId} {`);
      if (node.then) lines.push(...this.decompileSubGraph(node.then, indent + 1));
      if (node.else) {
        lines.push(`${prefix}} else {`);
        lines.push(...this.decompileSubGraph(node.else, indent + 1));
      }
      lines.push(`${prefix}}`);
    } else if (node.atom === 'loop') {
      const isNamedLoop = nodeId && !nodeId.startsWith('loop_');
      const loopPrefix = isNamedLoop ? `${prefix}let ${nodeId} = ` : '';
      const extras: string[] = [];
      if (node.maxIterations) extras.push(`max: ${node.maxIterations}`);
      if (node.condKey) extras.push(`cond: "${node.condKey}"`);
      lines.push(`${loopPrefix}loop ${extras.join(' ')} {`);
      if (node.nodes) lines.push(...this.decompileSubGraph(node.nodes, indent + 1));
      lines.push(`${prefix}}`);
    } else if (node.atom === 'forEach') {
      const isNamedForEach = nodeId && !nodeId.startsWith('forEach_');
      const fePrefix = isNamedForEach ? `${prefix}let ${nodeId} = ` : '';
      const extras: string[] = [];
      if (node.maxItems) extras.push(`max: ${node.maxItems}`);
      const idx = node.indexKey ? `, ${node.indexKey}` : '';
      lines.push(`${fePrefix}forEach ${node.itemKey || 'item'}${idx} in ${this.extractArrayRef(node.array)} ${extras.join(' ')} {`);
      if (node.nodes) lines.push(...this.decompileSubGraph(node.nodes, indent + 1));
      lines.push(`${prefix}}`);
    } else if (node.atom === 'filter') {
      const isNamedFilter = nodeId && !nodeId.startsWith('filter_');
      const fPrefix = isNamedFilter ? `${prefix}let ${nodeId} = ` : '';
      const idx = node.indexKey ? ` index: ${node.indexKey}` : '';
      lines.push(`${fPrefix}filter ${node.itemKey || 'item'}${idx} in ${this.extractArrayRef(node.array)} {`);
      if (node.nodes) lines.push(...this.decompileSubGraph(node.nodes, indent + 1));
      lines.push(`${prefix}}`);
    } else {
      const params = this.formatParams(node);
      lines.push(`${prefix}let ${nodeId} = ${node.atom}(${params})`);
    }

    return lines;
  }

  private decompileSubGraph(graph: Graph, indent: number): string[] {
    const lines: string[] = [];
    for (const nodeId of graph.order) {
      lines.push(...this.decompileNode(nodeId, graph.nodes[nodeId], indent));
    }
    return lines;
  }

  private formatParams(node: GraphNode): string {
    const SKIP = new Set(['atom', 'nodes', 'then', 'else', 'cond', 'maxIterations', 'itemKey', 'maxItems']);
    if (node.atom === 'forEach' || node.atom === 'filter') SKIP.add('array');
    const parts: string[] = [];
    for (const [key, value] of Object.entries(node)) {
      if (SKIP.has(key)) continue;
      parts.push(`${key}: ${this.formatValue(value)}`);
    }
    return parts.join(', ');
  }

  private formatValue(value: any): string {
    if (typeof value === 'string') {
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      return `"${escaped}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value === null) return 'null';
    if (Array.isArray(value)) return `[${value.map(v => this.formatValue(v)).join(', ')}]`;
    if (typeof value === 'object') {
      const parts = Object.entries(value).map(([k, v]) => {
        const keyStr = /^[a-zA-Z_]\w*$/.test(k) ? k : `"${k}"`;
        return `${keyStr}: ${this.formatValue(v)}`;
      });
      return `{ ${parts.join(', ')} }`;
    }
    return String(value);
  }

  private extractArrayRef(array: any): string {
    if (typeof array === 'string' && array.startsWith('{{')) {
      const match = array.match(/^\{\{(\w+)\}\}$/);
      return match ? match[1] : array;
    }
    return String(array);
  }

  private extractCondRef(cond: any): string {
    if (typeof cond === 'string' && cond.startsWith('{{')) {
      const match = cond.match(/^\{\{(\w+)(?:\.(.+?))?\}\}$/);
      return match ? (match[2] ? `${match[1]}.${match[2]}` : match[1]) : String(cond);
    }
    return String(cond);
  }
}

export function compileAcs(text: string): Graph {
  const parser = new AcsParser();
  const ast = parser.parse(text);
  const compiler = new AcsCompiler();
  return compiler.compile(ast);
}

export function decompileAcs(graph: Graph, name?: string): string {
  const decompiler = new AcsDecompiler();
  return decompiler.decompile(graph, name);
}
