/**
 * اختبارات حسابات صفحة الحسابات — القيم المتوقعة محسوبة يدوياً من التسلسل المالي المعتمد.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAccountsCalculations } from './useAccountsCalculations';

type Params = Parameters<typeof useAccountsCalculations>[0];

const contract = (id: string, extra: Record<string, unknown> = {}) => ({
  id, property_id: 'p-res', unit_id: null, tenant_name: `مستأجر ${id}`,
  start_date: '2025-01-01', end_date: '2026-01-01', rent_amount: 12000,
  payment_type: 'monthly', payment_count: 12, payment_amount: null, ...extra,
});

function buildData(overrides: Record<string, unknown> = {}) {
  return {
    income: [{ amount: 100000, source: 'إيجار' }, { amount: 20000, source: 'أخرى' }],
    expenses: [{ amount: 30000, expense_type: 'صيانة' }],
    contracts: [contract('c1'), contract('c2', { property_id: 'p-com' })],
    properties: [
      { id: 'p-res', property_type: 'سكني', vat_exempt: false },
      { id: 'p-com', property_type: 'تجاري', vat_exempt: false },
    ],
    allUnits: [],
    allocationMap: new Map([
      ['c1', { allocated_payments: 12, allocated_amount: 12000 }],
      ['c2', { allocated_payments: 4, allocated_amount: 8000 }],
    ]),
    paymentMap: { c1: { paid_months: 12, notes: '' }, c2: { paid_months: 1, notes: 'متأخر' } },
    appSettings: { data: { vat_percentage: '15', residential_vat_exempt: 'true' } },
    beneficiaries: [{ share_percentage: 60 }, { share_percentage: 40.5 }],
    ...overrides,
  };
}

function run(extra: Partial<Params> = {}, dataOverrides: Record<string, unknown> = {}) {
  const params = {
    data: buildData(dataOverrides) as unknown as Params['data'],
    adminPercent: 10, waqifPercent: 5, zakatAmount: 2000,
    waqfCorpusManual: 5000, waqfCorpusPrevious: 10000,
    manualVat: 1200, manualDistributions: 50000, ...extra,
  } satisfies Params;
  return renderHook(() => useAccountsCalculations(params)).result.current;
}

describe('useAccountsCalculations', () => {
  it('يجمع الدخل والمصروفات', () => {
    const r = run();
    expect(r.totalIncome).toBe(120000);
    expect(r.totalExpenses).toBe(30000);
  });

  it('يحتسب الضريبة على العقود التجارية فقط (السكني معفى)', () => {
    const r = run();
    expect(r.commercialRent).toBe(8000);
    expect(r.calculatedVat).toBeCloseTo(1200, 2);
  });

  it('يخضع الكل للضريبة عند إلغاء إعفاء السكني', () => {
    const r = run({}, { appSettings: { data: { vat_percentage: '15', residential_vat_exempt: 'false' } } });
    expect(r.commercialRent).toBe(20000);
    expect(r.calculatedVat).toBeCloseTo(3000, 2);
  });

  it('العقار المعفى يُستثنى من الضريبة حتى لو كان تجارياً', () => {
    const r = run({}, { properties: [
      { id: 'p-res', property_type: 'سكني', vat_exempt: false },
      { id: 'p-com', property_type: 'تجاري', vat_exempt: true },
    ] });
    expect(r.commercialRent).toBe(0);
  });

  it('السنة المفتوحة: لا حصص ولا ريع (تُحسب عند الإقفال فقط)', () => {
    const r = run({ isClosed: false });
    expect(r.adminShare).toBe(0);
    expect(r.waqifShare).toBe(0);
    expect(r.waqfRevenue).toBe(0);
    expect(r.netAfterZakat).toBe(120000 + 10000 - 30000 - 1200 - 2000);
  });

  it('السنة المقفلة بلا لقطة: التسلسل المالي الكامل', () => {
    const r = run({ isClosed: true });
    // shareBase = 120000 − 30000 − 2000 = 88000
    expect(r.shareBase).toBe(88000);
    expect(r.adminShare).toBe(8800);
    expect(r.waqifShare).toBe(4400);
    // netAfterZakat = 96800 → ريع = 96800 − 13200 = 83600
    expect(r.waqfRevenue).toBe(83600);
    expect(r.availableAmount).toBe(78600);
    expect(r.remainingBalance).toBe(28600);
    expect(r.isDeficit).toBe(false);
  });

  it('يرصد العجز عندما تتجاوز التوزيعات المتاح', () => {
    const r = run({ isClosed: true, manualDistributions: 90000 });
    expect(r.remainingBalance).toBe(-11400);
    expect(r.isDeficit).toBe(true);
  });

  it('التحصيل والمتأخرات من التخصيص لا من القسمة الخطية', () => {
    const r = run();
    const [c1, c2] = r.collectionData;
    expect(c1).toMatchObject({ paymentPerPeriod: 1000, expectedPayments: 12, totalCollected: 12000, arrears: 0, status: 'مكتمل' });
    expect(c2).toMatchObject({ paymentPerPeriod: 2000, expectedPayments: 4, totalCollected: 2000, arrears: 6000, status: 'متأخر' });
    expect(r.totalCollectedAll).toBe(14000);
    expect(r.totalArrearsAll).toBe(6000);
    expect(r.totalAnnualRent).toBe(20000);
  });

  it('بدون تخصيص يرجع إلى قيمة العقد ÷ عدد الدفعات', () => {
    const r = run({}, { allocationMap: new Map() });
    expect(r.getPaymentPerPeriod(buildData().contracts[0] as never)).toBe(1000);
  });

  it('يجمع نسب المستفيدين الفعلية (أساس التوزيع التناسبي)', () => {
    expect(run().totalBeneficiaryPercentage).toBe(100.5);
  });
});
