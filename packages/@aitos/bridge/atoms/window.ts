import { Context, Result } from '@aitos/core';
import { BridgeAtom } from '../BridgeAtom';

class MinimizeWindowAtom extends BridgeAtom {
  name = 'minimizeWindow';
  version = '1.0.0';
  meta = {
    input: [],
    output: { type: 'void', description: 'Minimize window to background' }
  };

  async execute(input: {}, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { 
        success: false, 
        error: 'Bridge not available. This atom requires native environment.' 
      };
    }

    try {
      await this.callBridge('minimizeWindow');
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: `Failed to minimize window: ${error}` };
    }
  }
}

class MaximizeWindowAtom extends BridgeAtom {
  name = 'maximizeWindow';
  version = '1.0.0';
  meta = {
    input: [],
    output: { type: 'void', description: 'Maximize or restore window' }
  };

  async execute(input: {}, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { 
        success: false, 
        error: 'Bridge not available. This atom requires native environment.' 
      };
    }

    try {
      await this.callBridge('maximizeWindow');
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: `Failed to maximize window: ${error}` };
    }
  }
}

class CloseWindowAtom extends BridgeAtom {
  name = 'closeWindow';
  version = '1.0.0';
  meta = {
    input: [],
    output: { type: 'void', description: 'Close the window' }
  };

  async execute(input: {}, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { 
        success: false, 
        error: 'Bridge not available. This atom requires native environment.' 
      };
    }

    try {
      await this.callBridge('closeWindow');
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: `Failed to close window: ${error}` };
    }
  }
}

class StartWindowDragAtom extends BridgeAtom {
  name = 'startWindowDrag';
  version = '1.0.0';
  meta = {
    input: [],
    output: { type: 'void', description: 'Start window drag' }
  };

  async execute(input: {}, context: Context): Promise<Result> {
    if (!this.isAvailable()) {
      return { 
        success: false, 
        error: 'Bridge not available. This atom requires native environment.' 
      };
    }

    try {
      await this.callBridge('startWindowDrag');
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: `Failed to start window drag: ${error}` };
    }
  }
}

export const minimizeWindowAtom = new MinimizeWindowAtom();
export const maximizeWindowAtom = new MaximizeWindowAtom();
export const closeWindowAtom = new CloseWindowAtom();
export const startWindowDragAtom = new StartWindowDragAtom();

export const windowAtoms = [
  minimizeWindowAtom,
  maximizeWindowAtom,
  closeWindowAtom,
  startWindowDragAtom,
];
