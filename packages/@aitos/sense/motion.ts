import { Atom, Context, Result } from 'aitos';

export const getAccelerometerAtom: Atom = {
  name: 'getAccelerometer',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'xKey', type: 'string', description: 'Store key for X axis' },
      { name: 'yKey', type: 'string', description: 'Store key for Y axis' },
      { name: 'zKey', type: 'string', description: 'Store key for Z axis' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { xKey: string; yKey: string; zKey: string }, context: Context): Promise<Result> => {
    return new Promise((resolve) => {
      if (!('Accelerometer' in window)) {
        resolve({ success: false, error: 'Accelerometer not supported' });
        return;
      }

      const sensor = new (window as any).Accelerometer({ frequency: 60 });
      
      sensor.addEventListener('reading', () => {
        context.store.set(input.xKey, sensor.x);
        context.store.set(input.yKey, sensor.y);
        context.store.set(input.zKey, sensor.z);
      });

      sensor.addEventListener('error', (event: any) => {
        console.error('Accelerometer error:', event.error);
      });

      sensor.start();
      resolve({ success: true, data: { done: true } });
    });
  },
};

export const getGyroscopeAtom: Atom = {
  name: 'getGyroscope',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'xKey', type: 'string', description: 'Store key for X axis' },
      { name: 'yKey', type: 'string', description: 'Store key for Y axis' },
      { name: 'zKey', type: 'string', description: 'Store key for Z axis' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { xKey: string; yKey: string; zKey: string }, context: Context): Promise<Result> => {
    return new Promise((resolve) => {
      if (!('Gyroscope' in window)) {
        resolve({ success: false, error: 'Gyroscope not supported' });
        return;
      }

      const sensor = new (window as any).Gyroscope({ frequency: 60 });
      
      sensor.addEventListener('reading', () => {
        context.store.set(input.xKey, sensor.x);
        context.store.set(input.yKey, sensor.y);
        context.store.set(input.zKey, sensor.z);
      });

      sensor.addEventListener('error', (event: any) => {
        console.error('Gyroscope error:', event.error);
      });

      sensor.start();
      resolve({ success: true, data: { done: true } });
    });
  },
};

export const getLocationAtom: Atom = {
  name: 'getLocation',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'latKey', type: 'string', description: 'Store key for latitude' },
      { name: 'lonKey', type: 'string', description: 'Store key for longitude' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { latKey: string; lonKey: string }, context: Context): Promise<Result> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, error: 'Geolocation not supported' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          context.store.set(input.latKey, position.coords.latitude);
          context.store.set(input.lonKey, position.coords.longitude);
          resolve({ success: true, data: { done: true } });
        },
        (error) => {
          resolve({ success: false, error: `Geolocation error: ${error.message}` });
        }
      );
    });
  },
};

export const getBatteryAtom: Atom = {
  name: 'getBattery',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'levelKey', type: 'string', description: 'Store key for battery level' },
      { name: 'chargingKey', type: 'string', description: 'Store key for charging status' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { levelKey: string; chargingKey: string }, context: Context): Promise<Result> => {
    try {
      const battery = await (navigator as any).getBattery();
      context.store.set(input.levelKey, battery.level);
      context.store.set(input.chargingKey, battery.charging);
      return { success: true, data: { done: true } };
    } catch (error) {
      return { success: false, error: 'Battery API not supported' };
    }
  },
};

export const getNetworkStatusAtom: Atom = {
  name: 'getNetworkStatus',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'onlineKey', type: 'string', description: 'Store key for online status' }
    ],
    output: { type: 'void', description: 'Nothing' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { onlineKey: string }, context: Context): Promise<Result> => {
    context.store.set(input.onlineKey, navigator.onLine);
    return { success: true, data: { done: true } };
  },
};
