import { describe, it, expect, beforeEach } from 'vitest';
import { getHistory, pushRun, clearHistory } from './history';

describe('diagnostics history', () => {
  beforeEach(() => clearHistory());

  it('pushes entries with timestamp and caps at 10', () => {
    for (let i = 0; i < 12; i++) pushRun({ total: i, pass: i, warn: 0, fail: 0, info: 0, healthScore: 100 });
    const h = getHistory();
    expect(h.length).toBe(10);
    expect(h[0].total).toBe(11);
    expect(typeof h[0].at).toBe('string');
  });

  it('clearHistory removes all entries', () => {
    pushRun({ total: 1, pass: 1, warn: 0, fail: 0, info: 0, healthScore: 100 });
    clearHistory();
    expect(getHistory()).toEqual([]);
  });
});
