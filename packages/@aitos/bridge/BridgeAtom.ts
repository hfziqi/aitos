import { Atom, Context, Result } from '@aitos/core';

export type FallbackHandler = () => Result | Promise<Result>;

export abstract class BridgeAtom implements Atom {
  public abstract name: string;
  public version = '1.0.0';
  public abstract meta: {
    input: Array<{ name: string; type: string; description?: string; optional?: boolean }>;
    output: { type: string; description?: string };
  };
  public characteristics = {
    stateless: true,
    atomic: true,
    composable: true
  };

  protected bridgeName = '__aitos_bridge__';

  protected getBridge(): any {
    return (window as any)[this.bridgeName];
  }

  public isAvailable(): boolean {
    return !!this.getBridge();
  }

  protected getFallback(): FallbackHandler | null {
    return null;
  }

  protected async callBridge(method: string, args?: any): Promise<any> {
    const bridge = this.getBridge();
    if (!bridge) {
      throw new Error('Bridge not available');
    }
    const fn = bridge[method];
    if (!fn) {
      throw new Error(`Method ${method} not found on bridge`);
    }
    return fn.call(bridge, args);
  }

  abstract execute(input: any, context: Context): Promise<Result>;
}
