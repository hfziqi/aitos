import { Atom, Context, Result } from '../types';

export const timestampToDateAtom: Atom = {
  name: 'timestampToDate',
  version: '1.0.0',
  meta: {
    input: [{ name: 'timestamp', type: 'number', description: 'Milliseconds since epoch' }],
    output: { type: 'object', description: '{ year, month, day, dayOfWeek, hour, minute, second }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { timestamp: number }, context: Context): Promise<Result> => {
    const d = new Date(input.timestamp);
    return {
      success: true,
      data: {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        dayOfWeek: d.getDay(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        second: d.getSeconds()
      }
    };
  },
};

export const getMonthDaysAtom: Atom = {
  name: 'getMonthDays',
  version: '1.0.0',
  meta: {
    input: [
      { name: 'year', type: 'number' },
      { name: 'month', type: 'number' }
    ],
    output: { type: 'object', description: '{ firstDay, daysInMonth }' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { year: number; month: number }, context: Context): Promise<Result> => {
    const firstDay = new Date(input.year, input.month, 1).getDay();
    const daysInMonth = new Date(input.year, input.month + 1, 0).getDate();
    return { success: true, data: { firstDay, daysInMonth } };
  },
};

export const isLeapYearAtom: Atom = {
  name: 'isLeapYear',
  version: '1.0.0',
  meta: {
    input: [{ name: 'year', type: 'number', description: 'Year to check' }],
    output: { type: 'boolean', description: 'True if leap year' }
  },
  characteristics: { stateless: true, atomic: true, composable: true },
  execute: async (input: { year: number }, context: Context): Promise<Result> => {
    const year = input.year;
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return { success: true, data: isLeap };
  },
};
