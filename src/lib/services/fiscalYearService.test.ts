/**
 * اختبارات fiscalYearService — تحقق دلالي + كشف تداخل + تطبيع أرقام عربية
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = { id: string; label: string; start_date: string; end_date: string; status: string };
let mockRows: Row[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: mockRows, error: null }),
      }),
    }),
  },
}));

import {
  validateFiscalYearInput,
  normalizeFiscalYearLabel,
  checkFiscalYearConflicts,
} from './fiscalYearService';

describe('normalizeFiscalYearLabel', () => {
  it('يحوّل الأرقام العربية إلى لاتينية', () => {
    expect(normalizeFiscalYearLabel('٢٠٢٥-٢٠٢٦')).toBe('2025-2026');
  });
  it('يحوّل الأرقام الفارسية', () => {
    expect(normalizeFiscalYearLabel('۲۰۲۵-۲۰۲۶')).toBe('2025-2026');
  });
  it('يزيل المسافات الزائدة', () => {
    expect(normalizeFiscalYearLabel('  2025-2026  ')).toBe('2025-2026');
  });
});

describe('validateFiscalYearInput - تنسيق YYYY-YYYY', () => {
  const baseDates = { start_date: '2025-10-25', end_date: '2026-10-24' };

  it.each([
    ['2025-2026'],
    ['1447-1448'],
    ['٢٠٢٥-٢٠٢٦'],
    ['۲۰۲۵-۲۰۲۶'],
    ['  2025-2026  '],
  ])('يقبل %s', (label) => {
    expect(validateFiscalYearInput({ label, ...baseDates })).toBeNull();
  });

  it.each([
    ['25-26'],
    ['2025-2027'],
    ['2026-2025'],
    ['2025/2026'],
    [''],
  ])('يرفض %s', (label) => {
    expect(validateFiscalYearInput({ label, ...baseDates })).not.toBeNull();
  });
});

describe('validateFiscalYearInput - تواريخ ومدة', () => {
  it('يرفض start == end', () => {
    expect(validateFiscalYearInput({ label: '2025-2026', start_date: '2025-10-25', end_date: '2025-10-25' }))
      .toMatch(/قبل تاريخ النهاية/);
  });
  it('يرفض المدة > 400 يوم', () => {
    expect(validateFiscalYearInput({ label: '2025-2026', start_date: '2025-01-01', end_date: '2026-12-31' }))
      .toMatch(/تتجاوز/);
  });
  it('يقبل 366 يوم (كبيسة)', () => {
    expect(validateFiscalYearInput({ label: '2024-2025', start_date: '2024-01-01', end_date: '2024-12-31' }))
      .toBeNull();
  });
  it('لا يتأثر بسلسلة بتوقيت صريح', () => {
    expect(validateFiscalYearInput({ label: '2025-2026', start_date: '2025-10-25T00:00:00+03:00', end_date: '2026-07-01T23:59:59+03:00' }))
      .toBeNull();
  });
});

describe('checkFiscalYearConflicts', () => {
  beforeEach(() => { mockRows = []; });

  const input = { label: '2026-2027', start_date: '2026-10-25', end_date: '2027-10-24' };

  it('يعيد null بدون سنوات', async () => {
    expect(await checkFiscalYearConflicts(input)).toBeNull();
  });

  it('سيناريو: حذف 2024-2025 ثم إعادة الإنشاء بنفس التاريخ يُقبل', async () => {
    mockRows = [];
    const sameDates = { label: '2024-2025', start_date: '2024-10-25', end_date: '2025-10-24' };
    expect(await checkFiscalYearConflicts(sameDates)).toBeNull();
  });

  it('يرفض تداخل جزئي من البداية', async () => {
    mockRows = [{ id: '1', label: '2025-2026', start_date: '2025-10-25', end_date: '2026-10-24', status: 'closed' }];
    const conflict = { label: '2026-2027', start_date: '2026-06-01', end_date: '2027-05-31' };
    expect(await checkFiscalYearConflicts(conflict)).toMatch(/2025-2026/);
  });

  it('يرفض تطابق اليوم الأخير (تداخل ضمني)', async () => {
    mockRows = [{ id: '1', label: '2025-2026', start_date: '2025-10-25', end_date: '2026-10-24', status: 'closed' }];
    const conflict = { label: '2026-2027', start_date: '2026-10-24', end_date: '2027-10-23' };
    expect(await checkFiscalYearConflicts(conflict)).toMatch(/تداخل/);
  });

  it('يقبل اليوم التالي مباشرة (تلامس سليم)', async () => {
    mockRows = [{ id: '1', label: '2025-2026', start_date: '2025-10-25', end_date: '2026-10-24', status: 'closed' }];
    const next = { label: '2026-2027', start_date: '2026-10-25', end_date: '2027-10-24' };
    expect(await checkFiscalYearConflicts(next)).toBeNull();
  });

  it('يرفض التداخل مع سنة مغلقة منشورة', async () => {
    mockRows = [{ id: '1', label: '2025-2026', start_date: '2025-10-25', end_date: '2026-10-24', status: 'closed' }];
    expect(await checkFiscalYearConflicts({ label: '2025-2026-x', start_date: '2025-12-01', end_date: '2026-12-01' }))
      .toMatch(/تداخل/);
  });

  it('يرفض تكرار المسمى بعد تطبيع الأرقام العربية', async () => {
    mockRows = [{ id: '1', label: '2025-2026', start_date: '2030-01-01', end_date: '2030-12-31', status: 'closed' }];
    expect(await checkFiscalYearConflicts({ label: '٢٠٢٥-٢٠٢٦', start_date: '2040-01-01', end_date: '2040-12-31' }))
      .toMatch(/بنفس المسمى/);
  });

  it('يرفض وجود سنة active أخرى', async () => {
    mockRows = [{ id: '1', label: '2025-2026', start_date: '2025-01-01', end_date: '2025-12-31', status: 'active' }];
    expect(await checkFiscalYearConflicts({ label: '2027-2028', start_date: '2027-01-01', end_date: '2027-12-31' }))
      .toMatch(/نشطة/);
  });
});
