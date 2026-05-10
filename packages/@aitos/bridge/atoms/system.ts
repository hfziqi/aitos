import { Context, Result } from '@aitos/core';
import { BridgeAtom } from '../BridgeAtom';

class GetSystemInfoAtom extends BridgeAtom {
  name = 'getSystemInfo';
  version = '1.0.0';
  meta = {
    input: [],
    output: { type: 'object', description: 'System information including OS, platform, etc.' }
  };

  async execute(input: {}, context: Context): Promise<Result> {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    let os = 'unknown';
    let shell = 'unknown';
    
    if (userAgent.includes('Windows')) {
      os = 'Windows';
      shell = 'PowerShell';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
      shell = 'bash';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
      shell = 'bash';
    }
    
    const isDesktop = this.isAvailable();
    
    return {
      success: true,
      data: {
        os,
        platform,
        shell,
        isDesktop,
        userAgent
      }
    };
  }
}

export const getSystemInfoAtom = new GetSystemInfoAtom();

export const systemAtoms = [
  getSystemInfoAtom,
];
