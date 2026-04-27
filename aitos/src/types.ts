export interface Atom {
  name: string;
  version: string;
  meta: {
    input: Array<{ name: string; type: string; description?: string }>;
    output: { type: string; description?: string };
  };
  characteristics: {
    stateless: boolean;
    atomic: boolean;
    composable: boolean;
  };
  execute: (input: any, context: Context) => Promise<Result>;
}

export interface Result {
  success: boolean;
  data?: any;
  error?: string;
}

export interface GraphNode {
  atom: string;
  nodes?: Graph;
  then?: Graph;
  else?: Graph;
  [key: string]: any;
}

export type GraphMode = 'kernel' | 'user';

export interface GraphInterface {
  input: Array<{ name: string; type: string; description?: string }>;
  output: { type: string; description?: string };
}

export interface GraphBudget {
  maxSteps?: number;
  maxDepth?: number;
  timeoutMs?: number;
}

export interface Graph {
  mode?: GraphMode;
  _meta?: { description?: string; type?: string; category?: string; author?: string };
  interface?: GraphInterface;
  requires?: Record<string, string>;
  budget?: GraphBudget;
  imports?: Array<{ ref: string; as?: string }>;
  order: string[];
  nodes: Record<string, GraphNode>;
}

export interface Scope {
  [key: string]: any;
}

export interface Context {
  store: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    has: (key: string) => boolean;
    delete: (key: string) => void;
    clear: () => void;
    keys: () => IterableIterator<string>;
  };
  currentScope: Scope;
  execute: (atomName: string, input: any) => Promise<Result>;
  executeGraph?: (graph: Graph, scope?: Scope) => Promise<Record<string, any>>;
  runtime?: Runtime;
}

export interface AtomRegistry {
  register: (atom: Atom) => void;
  get: (name: string) => Atom | undefined;
  has: (name: string) => boolean;
  list: () => string[];
}

export interface GraphValidationError {
  node: string;
  code: string;
  param: string;
  ref: string;
  message: string;
  suggestions?: GraphSuggestion[];
}

export interface GraphSuggestion {
  id: string;
  type: string;
  source: string;
}

export interface Runtime {
  register(atom: Atom): void;
  validateGraph(graph: Graph): { valid: boolean; errors: string[] };
  executeGraph(graph: Graph, context: Context, outerScope?: Record<string, any>): Promise<Record<string, any>>;
  listAtoms(): Atom[];
  getSkillSet(): string;
}
