import { Context, Result } from '@aitos/core';
import { BridgeAtom } from '@aitos/bridge';

class ExecCommandAtom extends BridgeAtom {
  name = 'execCommand';
  version = '1.0.0';
  meta = {
    input: [
      { name: 'command', type: 'string', description: 'Command to execute on the system' },
      { name: 'args', type: 'array', description: 'Command arguments (optional)' },
      { name: 'cwd', type: 'string', description: 'Working directory (optional)' }
    ],
    output: { type: 'object', description: 'Execution result with stdout, stderr, and exitCode' }
  };

  async execute(input: { command: string; args?: string[]; cwd?: string }, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { 
        success: false, 
        error: 'Bridge not available. This atom requires desktop environment.' 
      };
    }

    try {
      const result = await this.callBridge('exec', {
        command: input.command,
        args: input.args || [],
        cwd: input.cwd
      });

      return {
        success: true, 
        data: {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.exitCode ?? 0
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to execute command: ${error}` 
      };
    }
  }
}

export const execCommandAtom = new ExecCommandAtom();
