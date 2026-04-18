/**
 * اختبارات صلاحيات تعديل السنة المالية
 */
import { describe, it, expect } from 'vitest';
import { canModifyFiscalYear } from './permissions';

describe('canModifyFiscalYear', () => {
  it('يسمح للناظر بتعديل السنة المقفلة', () => {
    expect(canModifyFiscalYear('admin', true)).toBe(true);
  });

  it('يسمح للناظر بتعديل السنة النشطة', () => {
    expect(canModifyFiscalYear('admin', false)).toBe(true);
  });

  it('يمنع المحاسب من تعديل السنة المقفلة', () => {
    expect(canModifyFiscalYear('accountant', true)).toBe(false);
  });

  it('يسمح للمحاسب بتعديل السنة النشطة', () => {
    expect(canModifyFiscalYear('accountant', false)).toBe(true);
  });

  it('يمنع المستفيد من تعديل السنة المقفلة', () => {
    expect(canModifyFiscalYear('beneficiary', true)).toBe(false);
  });

  it('يسمح للمستفيد بتعديل السنة النشطة (لم يفرض الدور هنا)', () => {
    // الفلترة بالدور تتم في طبقة RLS؛ هذه الدالة تتعلق بحالة السنة فقط
    expect(canModifyFiscalYear('beneficiary', false)).toBe(true);
  });

  it('يتعامل مع role = null كغير مسموح للسنة المقفلة', () => {
    expect(canModifyFiscalYear(null, true)).toBe(false);
  });

  it('يسمح بـ role = null للسنة النشطة', () => {
    expect(canModifyFiscalYear(null, false)).toBe(true);
  });

  it('لا يخلط بين الواقف والناظر', () => {
    expect(canModifyFiscalYear('waqif', true)).toBe(false);
  });
});
