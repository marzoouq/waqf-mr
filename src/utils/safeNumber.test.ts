import { describe, it, expect } from 'vitest';
import { safeNumber, safePercent } from './safeNumber';

describe('safeNumber', () => {
  it('يُحوّل الأرقام العادية', () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber(3.14)).toBe(3.14);
    expect(safeNumber(0)).toBe(0);
    expect(safeNumber(-100)).toBe(-100);
  });

  it('يُحوّل النصوص الرقمية', () => {
    expect(safeNumber('100')).toBe(100);
    expect(safeNumber('3.5')).toBe(3.5);
  });

  it('يُعيد 0 لـ null و undefined', () => {
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber(undefined)).toBe(0);
  });

  it('يُعيد 0 للنصوص غير الرقمية', () => {
    expect(safeNumber('')).toBe(0);
    expect(safeNumber('abc')).toBe(0);
  });

  it('يُعيد 0 لـ NaN و Infinity', () => {
    expect(safeNumber(NaN)).toBe(0);
    expect(safeNumber(Infinity)).toBe(0);
    expect(safeNumber(-Infinity)).toBe(0);
  });

  it('يُعيد 0 للكائنات والمصفوفات', () => {
    expect(safeNumber({})).toBe(0);
    expect(safeNumber([])).toBe(0);
  });
});

describe('safePercent', () => {
  it('يُحوّل النسبة العادية', () => {
    expect(safePercent('10', 5)).toBe(10);
    expect(safePercent(15, 5)).toBe(15);
  });

  it('يُعيد القيمة الافتراضية لـ null/undefined/فارغ', () => {
    expect(safePercent(null, 10)).toBe(10);
    expect(safePercent(undefined, 10)).toBe(10);
    expect(safePercent('', 10)).toBe(10);
  });

  it('يُعيد القيمة الافتراضية للنص غير الرقمي', () => {
    expect(safePercent('abc', 5)).toBe(5);
  });
});
