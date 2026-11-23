import { describe, it, expect } from 'vitest';
import { formatAxisTick } from './axisTick';

describe('formatAxisTick', () => {
  it('1,800,000 → 1.8 مليون', () => expect(formatAxisTick(1_800_000)).toBe('1.8 مليون'));
  it('450,000 → 450 ألف', () => expect(formatAxisTick(450_000)).toBe('450 ألف'));
  it('0 → 0', () => expect(formatAxisTick(0)).toBe('0'));
});
