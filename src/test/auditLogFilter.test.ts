import { describe, it, expect } from 'vitest';
import { getTableNameAr, getOperationNameAr } from '@/hooks/useAuditLog';

/**
 * اختبارات فلترة سجل المراجعة وخريطة أسماء الجداول والعمليات.
 */
describe('AuditLog – خريطة أسماء الجداول', () => {
  const allTables = [
    ['income', 'الدخل'],
    ['expenses', 'المصروفات'],
    ['accounts', 'الحسابات'],
    ['distributions', 'التوزيعات'],
    ['invoices', 'الفواتير'],
    ['properties', 'العقارات'],
    ['contracts', 'العقود'],
    ['beneficiaries', 'المستفيدين'],
    ['units', 'الوحدات'],
    ['fiscal_years', 'السنوات المالية'],
  ] as const;

  it.each(allTables)('getTableNameAr("%s") يرجع "%s"', (key, expected) => {
    expect(getTableNameAr(key)).toBe(expected);
  });

  it('جدول غير معرّف يرجع الاسم كما هو', () => {
    expect(getTableNameAr('unknown_table')).toBe('unknown_table');
  });
});

describe('AuditLog – خريطة أسماء العمليات', () => {
  it.each([
    ['INSERT', 'إضافة'],
    ['UPDATE', 'تعديل'],
    ['DELETE', 'حذف'],
  ] as const)('getOperationNameAr("%s") يرجع "%s"', (op, expected) => {
    expect(getOperationNameAr(op)).toBe(expected);
  });

  it('عملية غير معرّفة ترجع الاسم كما هو', () => {
    expect(getOperationNameAr('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('AuditLog – اكتمال الجداول المفلترة', () => {
  // هذه القائمة يجب أن تطابق SelectItems في AuditLogPage.tsx
  const expectedFilterTables = [
    'income', 'expenses', 'accounts', 'distributions', 'invoices',
    'properties', 'contracts', 'beneficiaries', 'units', 'fiscal_years',
  ];

  it('جميع الجداول التي لها مشغل تدقيق لها ترجمة عربية', () => {
    for (const table of expectedFilterTables) {
      const arName = getTableNameAr(table);
      expect(arName).not.toBe(table); // must have an Arabic name, not fallback
    }
  });

  it('عدد الجداول المدعومة = 10', () => {
    expect(expectedFilterTables.length).toBe(10);
  });
});
