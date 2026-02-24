import { describe, it, expect } from 'vitest';
import {
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, TABLE_HEAD_RED,
  baseTableStyles, headStyles, footStyles,
} from './core';

describe('PDF Core utilities', () => {
  it('TABLE_HEAD_GREEN هو لون أخضر RGB', () => {
    expect(TABLE_HEAD_GREEN).toEqual([22, 101, 52]);
  });

  it('TABLE_HEAD_GOLD هو لون ذهبي RGB', () => {
    expect(TABLE_HEAD_GOLD).toEqual([202, 138, 4]);
  });

  it('TABLE_HEAD_RED هو لون أحمر RGB', () => {
    expect(TABLE_HEAD_RED).toEqual([180, 40, 40]);
  });

  it('baseTableStyles يعيد الأنماط الأساسية RTL', () => {
    const result = baseTableStyles('Amiri');
    expect(result.styles.halign).toBe('right');
    expect(result.styles.font).toBe('Amiri');
  });

  it('headStyles يعيد أنماط الرأس بالخط الغامق', () => {
    const result = headStyles(TABLE_HEAD_GREEN, 'Amiri');
    expect(result.headStyles.fillColor).toEqual([22, 101, 52]);
    expect(result.headStyles.fontStyle).toBe('bold');
  });

  it('footStyles يعيد أنماط التذييل', () => {
    const result = footStyles(TABLE_HEAD_GOLD, 'Amiri');
    expect(result.footStyles.fillColor).toEqual([202, 138, 4]);
    expect(result.footStyles.fontStyle).toBe('bold');
  });

  it('baseTableStyles يستخدم cellPadding = 4', () => {
    const result = baseTableStyles('helvetica');
    expect(result.styles.cellPadding).toBe(4);
  });
});
