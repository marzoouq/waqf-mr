import { describe, it, expect } from 'vitest';
import {
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
} from './core';

describe('PDF Core utilities', () => {
  it('TABLE_HEAD_GREEN هو لون أخضر RGB', () => {
    expect(TABLE_HEAD_GREEN).toEqual([18, 73, 57]);
  });

  it('TABLE_HEAD_GOLD هو لون ذهبي RGB', () => {
    expect(TABLE_HEAD_GOLD).toEqual([150, 112, 44]);
  });

  it('TABLE_HEAD_RED هو لون أحمر RGB', () => {
    expect(TABLE_HEAD_RED).toEqual([167, 64, 57]);
  });

  it('baseTableStyles يعيد الأنماط الأساسية RTL', () => {
    const result = baseTableStyles('Amiri');
    expect(result.styles.halign).toBe('right');
    expect(result.styles.font).toBe('Amiri');
  });

  it('headStyles يعيد أنماط الرأس بالخط الغامق', () => {
    const result = headStyles(TABLE_HEAD_GREEN, 'Amiri');
    expect(result.headStyles.fillColor).toEqual([18, 73, 57]);
    expect(result.headStyles.fontStyle).toBe('bold');
  });

  it('footStyles يعيد أنماط التذييل', () => {
    const result = footStyles(TABLE_HEAD_GOLD, 'Amiri');
    expect(result.footStyles.fillColor).toEqual([150, 112, 44]);
    expect(result.footStyles.fontStyle).toBe('bold');
  });

  it('الجداول تترك مساحة أعلى الصفحات التالية للترويسة المختصرة فلا تتداخل معها', () => {
    const { margin } = baseTableStyles('Amiri');
    // الترويسة المختصرة تنتهي عند 17.5 مم
    expect(margin.top).toBeGreaterThan(17.5);
    expect(margin.bottom).toBe(30);
  });

  it('baseTableStyles يستخدم cellPadding = 4', () => {
    const result = baseTableStyles('helvetica');
    expect(result.styles.cellPadding).toBe(4);
  });
});
