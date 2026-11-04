import { describe, it, expect } from 'vitest';
import { footStyles, baseTableStyles } from '@/utils/pdf/core/core';

describe('إجمالي الجداول في PDF', () => {
  it('يُطبع سطر الإجمالي مرة واحدة في آخر صفحة', () => {
    expect(footStyles([0, 0, 0], 'Amiri').showFoot).toBe('lastPage');
  });
  it('مساحة سفلية لتذييل الوثيقة', () => {
    expect(baseTableStyles('Amiri').margin.bottom).toBeGreaterThanOrEqual(30);
  });
});
