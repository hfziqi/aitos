import { Atom, Context, Result, TelemetryStats } from '../types';

export const getTelemetryStatsAtom: Atom = {
  name: 'getTelemetryStats',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'array', description: 'Aggregated telemetry statistics per atom' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (_input: any, context: Context): Promise<Result> => {
    if (!context.runtime) {
      return { success: false, error: 'Runtime not available' };
    }
    const stats = context.runtime.getTelemetryStats();
    return { success: true, data: stats };
  }
};

export const resetTelemetryAtom: Atom = {
  name: 'resetTelemetry',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'null', description: 'Clears all telemetry data' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (_input: any, context: Context): Promise<Result> => {
    if (!context.runtime) {
      return { success: false, error: 'Runtime not available' };
    }
    context.runtime.resetTelemetry();
    return { success: true, data: null };
  }
};

export const flushTelemetryAtom: Atom = {
  name: 'flushTelemetry',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'object', description: 'Flush result with snapshot info' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (_input: any, context: Context): Promise<Result> => {
    if (!context.runtime) {
      return { success: false, error: 'Runtime not available' };
    }
    const snapshot = context.runtime.flushTelemetry();
    return { success: true, data: { flushed: true, timestamp: snapshot.timestamp } };
  }
};

export const getTelemetryHistoryAtom: Atom = {
  name: 'getTelemetryHistory',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'array', description: 'Historical telemetry snapshots' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (_input: any, context: Context): Promise<Result> => {
    if (!context.runtime) {
      return { success: false, error: 'Runtime not available' };
    }
    const history = context.runtime.getTelemetryHistory();
    return { success: true, data: history };
  }
};

export const analyzeTelemetryAtom: Atom = {
  name: 'analyzeTelemetry',
  version: '1.0.0',
  meta: {
    input: [],
    output: { type: 'object', description: 'Telemetry analysis with summary, top atoms, error hotspots, and graph usage' }
  },
  characteristics: { stateless: false, atomic: true, composable: true },
  execute: async (_input: any, context: Context): Promise<Result> => {
    if (!context.runtime) {
      return { success: false, error: 'Runtime not available' };
    }
    const stats: TelemetryStats[] = context.runtime.getTelemetryStats();

    if (stats.length === 0) {
      return { success: true, data: { found: false, message: 'No telemetry data available yet' } };
    }

    const totalCalls = stats.reduce((sum, s) => sum + s.count, 0);
    const totalErrors = stats.reduce((sum, s) => sum + s.errorCount, 0);
    const avgDuration = Math.round(
      stats.reduce((sum, s) => sum + s.avgDuration * s.count, 0) / totalCalls
    );

    const topAtoms = [...stats]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const errorHotspots = stats
      .filter(s => s.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate);

    const graphUsage = stats.reduce<Record<string, { calls: number; errors: number }>>(
      (acc, s) => {
        for (const g of s.graphs) {
          if (!acc[g]) acc[g] = { calls: 0, errors: 0 };
          acc[g].calls += s.count;
          acc[g].errors += s.errorCount;
        }
        return acc;
      }, {}
    );

    return {
      success: true,
      data: {
        found: true,
        summary: {
          totalAtoms: stats.length,
          totalCalls,
          totalErrors,
          errorRate: totalCalls > 0
            ? Math.round((totalErrors / totalCalls) * 10000) / 100
            : 0,
          avgDuration,
        },
        topAtoms: topAtoms.map(a => ({
          name: a.atom,
          calls: a.count,
          avgDuration: a.avgDuration,
          errorRate: a.errorRate,
        })),
        errorHotspots: errorHotspots.map(a => ({
          name: a.atom,
          errorRate: a.errorRate,
          errorCount: a.errorCount,
          totalCalls: a.count,
        })),
        graphUsage: Object.entries(graphUsage)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.calls - a.calls),
        timestamp: Date.now(),
      }
    };
  }
};
