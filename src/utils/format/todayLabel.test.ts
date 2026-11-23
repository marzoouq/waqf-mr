import { describe, it, expect } from 'vitest';
import { formatTodayLabel } from './todayLabel';

describe('formatTodayLabel', () => {
  it('يعرض التاريخ الهجري (أم القرى) والميلادي بأرقام لاتينية بتوقيت الرياض', () => {
    // 23 نوفمبر 2026 = 14 جمادى الآخرة 1448
    const label = formatTodayLabel(new Date('2026-11-23T09:00:00Z'));
    expect(label.weekday).toBe('الاثنين');
    expect(label.hijri).toContain('1448');
    expect(label.hijri).toContain('جمادى');
    expect(label.gregorian).toContain('2026');
    expect(label.gregorian).toContain('نوفمبر');
  });

  it('يعتمد يوم الرياض لا يوم UTC قرب منتصف الليل', () => {
    // 22:30 UTC يوم الأحد = 01:30 الاثنين في الرياض
    expect(formatTodayLabel(new Date('2026-11-22T22:30:00Z')).weekday).toBe('الاثنين');
  });

  it('يعيد قيماً فارغة لتاريخ غير صالح', () => {
    expect(formatTodayLabel(new Date('invalid'))).toEqual({ weekday: '', hijri: '', gregorian: '' });
  });
});
