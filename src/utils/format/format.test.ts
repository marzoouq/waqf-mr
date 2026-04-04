import { describe, it, expect } from 'vitest';
import { fmt, fmtInt, fmtSAR, fmtPct, fmtDate, fmtDateHijri } from './format';

describe('fmt', () => {
  it('ينسّق أرقام مالية بفواصل آلاف وعشرية', () => {
    expect(fmt(16666.67)).toBe('16,666.67');
    expect(fmt(1000000)).toBe('1,000,000.00');
  });

  it('يُرجع "0.00" لـ null/undefined/NaN', () => {
    expect(fmt(null)).toBe('0.00');
    expect(fmt(undefined)).toBe('0.00');
    expect(fmt(NaN)).toBe('0.00');
  });

  it('يدعم عدد منازل عشرية مخصص', () => {
    expect(fmt(1234.5678, 0)).toBe('1,235');
    expect(fmt(1234.5678, 3)).toBe('1,234.568');
    expect(fmt(1234.5678, 1)).toBe('1,234.6');
  });

  it('يعالج أرقام سالبة', () => {
    expect(fmt(-5000)).toBe('-5,000.00');
  });

  it('يعالج صفر', () => {
    expect(fmt(0)).toBe('0.00');
  });
});

describe('fmtInt', () => {
  it('ينسّق بدون كسور', () => {
    expect(fmtInt(1666)).toBe('1,666');
    expect(fmtInt(0)).toBe('0');
    expect(fmtInt(null)).toBe('0');
  });
});

describe('fmtSAR', () => {
  it('يضيف رمز العملة', () => {
    expect(fmtSAR(16666.67)).toBe('16,666.67 ر.س');
    expect(fmtSAR(0)).toBe('0.00 ر.س');
    expect(fmtSAR(null)).toBe('0.00 ر.س');
  });

  it('يدعم منازل عشرية مخصصة', () => {
    expect(fmtSAR(1234, 0)).toBe('1,234 ر.س');
  });
});

describe('fmtPct', () => {
  it('ينسّق كنسبة مئوية', () => {
    expect(fmtPct(16.666)).toBe('16.67%');
    expect(fmtPct(100)).toBe('100.00%');
    expect(fmtPct(0)).toBe('0.00%');
    expect(fmtPct(null)).toBe('0.00%');
  });

  it('يدعم منازل عشرية مخصصة', () => {
    expect(fmtPct(33.333, 1)).toBe('33.3%');
  });
});

describe('fmtDate', () => {
  it('ينسّق تاريخ ISO إلى YYYY/MM/DD', () => {
    expect(fmtDate('2025-01-15')).toBe('2025/01/15');
  });

  it('يعالج كائن Date', () => {
    const d = new Date(2025, 0, 15); // January 15, 2025
    expect(fmtDate(d)).toBe('2025/01/15');
  });

  it('يُرجع "—" لـ null/undefined', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate(undefined)).toBe('—');
  });

  it('يُرجع "—" لتاريخ غير صالح', () => {
    expect(fmtDate('invalid-date')).toBe('—');
  });

  it('يُرجع "—" لنص فارغ', () => {
    expect(fmtDate('')).toBe('—');
  });
});

describe('fmtDateHijri', () => {
  it('ينسّق تاريخ إلى هجري', () => {
    const result = fmtDateHijri('2025-01-15');
    // التاريخ الهجري يجب أن يحتوي أرقام عربية أو لاتينية وفواصل
    expect(result).not.toBe('—');
    expect(result.length).toBeGreaterThan(0);
  });

  it('يُرجع "—" لـ null/undefined', () => {
    expect(fmtDateHijri(null)).toBe('—');
    expect(fmtDateHijri(undefined)).toBe('—');
  });

  it('يُرجع "—" لتاريخ غير صالح', () => {
    expect(fmtDateHijri('bad')).toBe('—');
  });
});
