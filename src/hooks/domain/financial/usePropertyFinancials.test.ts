import { describe, it, expect } from 'vitest';
import { computePropertyFinancials } from './usePropertyFinancials';

const propertyId = 'prop-1';
const baseUnits = [{ id: 'u1', property_id: propertyId, status: 'مؤجرة' }];

describe('computePropertyFinancials — allocationMap fallback', () => {
  const contracts = [
    { id: 'c1', property_id: propertyId, unit_id: 'u1', status: 'active', rent_amount: 12000 },
    { id: 'c2', property_id: propertyId, unit_id: 'u1', status: 'active', rent_amount: 24000 },
  ];

  it('Map فارغة → fallback إلى rent_amount الكامل (يحل bug الصفر)', () => {
    const r = computePropertyFinancials({
      propertyId,
      contracts,
      expenses: [],
      units: baseUnits,
      isSpecificYear: false,
      allocationMap: new Map(),
    });
    expect(r.contractualRevenue).toBe(36000);
    expect(r.activeAnnualRent).toBe(36000);
    expect(r.monthlyRent).toBe(3000);
  });

  it('Map غير ممرّرة → نفس سلوك الـ fallback', () => {
    const r = computePropertyFinancials({
      propertyId,
      contracts,
      expenses: [],
      units: baseUnits,
      isSpecificYear: false,
    });
    expect(r.contractualRevenue).toBe(36000);
    expect(r.monthlyRent).toBe(3000);
  });

  it('Map مملوءة كلياً → تُستخدم قيم التخصيص الفعلية', () => {
    const map = new Map([
      ['c1', { allocated_amount: 12000 }],
      ['c2', { allocated_amount: 12000 }], // عقد ممتد لسنتين → نصفه فقط هذه السنة
    ]);
    const r = computePropertyFinancials({
      propertyId,
      contracts,
      expenses: [],
      units: baseUnits,
      isSpecificYear: true,
      allocationMap: map,
    });
    expect(r.contractualRevenue).toBe(24000);
    expect(r.activeAnnualRent).toBe(24000);
    expect(r.monthlyRent).toBe(2000);
  });

  it('Map مملوءة جزئياً → عقد بلا تخصيص = 0 (لا يضخّم)', () => {
    const map = new Map([['c1', { allocated_amount: 12000 }]]);
    const r = computePropertyFinancials({
      propertyId,
      contracts,
      expenses: [],
      units: baseUnits,
      isSpecificYear: true,
      allocationMap: map,
    });
    // c2 بلا تخصيص → 0 وليس 24000
    expect(r.contractualRevenue).toBe(12000);
    expect(r.activeAnnualRent).toBe(12000);
    expect(r.monthlyRent).toBe(1000);
  });

  it('صافي الدخل يطرح المصروفات من الدخل النشط', () => {
    const r = computePropertyFinancials({
      propertyId,
      contracts,
      expenses: [{ id: 'e1', property_id: propertyId, amount: 6000 }],
      units: baseUnits,
      isSpecificYear: false,
      allocationMap: new Map(),
    });
    expect(r.totalExpenses).toBe(6000);
    expect(r.netIncome).toBe(30000);
  });
});
