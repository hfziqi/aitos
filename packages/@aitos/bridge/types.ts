export interface BridgeMethod {
  name: string;
  description?: string;
  params?: Record<string, any>;
}

export interface BridgeInfo {
  platform: 'desktop' | 'mobile' | 'web';
  version: string;
  methods: BridgeMethod[];
}

export interface ReadLocalResult {
  success: boolean;
  value?: string;
  error?: string;
}

export interface WriteLocalResult {
  success: boolean;
  error?: string;
}

export interface ListLocalResult {
  success: boolean;
  keys?: string[];
  error?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SystemInfo {
  os: string;
  platform: string;
  shell: string;
  isDesktop: boolean;
  userAgent: string;
}
