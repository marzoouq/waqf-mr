/**
 * عقد اختبار: يثبت تطابق `computeContractualRevenue` مع منطق RPC
 * `get_dashboard_full_summary` المُستخدم في لوحة الناظر.
 *
 * القواعد المُثبَّتة:
 *  - الأولوية 1: إذا كان مجموع `allocated_amount` > 0 → يُستخدم.
 *  - الأولوية 2 (Fallback): إذا لم تُوجد allocations → مجموع `rent_amount`.
 *  - لا يُخلط بين السنوات (المسؤولية على المتصل بتمرير عقود/مخصصات السنة فقط).
 */
import { describe, it, expect } from 'vitest';
import { computeContractualRevenue } from './computeContractualRevenue';

describe('computeContractualRevenue', () => {
  it('uses sum of allocations when allocations exist', () => {
    const contracts = [
      { id: 'c1', rent_amount: 10000, fiscal_year_id: 'fy1' },
      { id: 'c2', rent_amount: 5000, fiscal_year_id: 'fy1' },
    ];
    const allocations = [
      { contract_id: 'c1', fiscal_year_id: 'fy1', allocated_amount: 8000 },
      { contract_id: 'c2', fiscal_year_id: 'fy1', allocated_amount: 3000 },
    ];
    expect(computeContractualRevenue(contracts, allocations)).toBe(11000);
  });

  it('falls back to sum of rent_amount when no allocations', () => {
    const contracts = [
      { id: 'c1', rent_amount: 10000, fiscal_year_id: 'fy1' },
      { id: 'c2', rent_amount: 5000, fiscal_year_id: 'fy1' },
    ];
    expect(computeContractualRevenue(contracts, [])).toBe(15000);
  });

  it('uses allocations when even a single allocation > 0 exists', () => {
    const contracts = [
      { id: 'c1', rent_amount: 10000, fiscal_year_id: 'fy1' },
      { id: 'c2', rent_amount: 5000, fiscal_year_id: 'fy1' },
    ];
    // عقد واحد فقط له allocation — المنطق الحالي يستخدم allocations حالما يكون المجموع > 0
    const allocations = [
      { contract_id: 'c1', fiscal_year_id: 'fy1', allocated_amount: 8000 },
    ];
    expect(computeContractualRevenue(contracts, allocations)).toBe(8000);
  });

  it('returns 0 when no contracts and no allocations', () => {
    expect(computeContractualRevenue([], [])).toBe(0);
  });

  it('handles string numeric values via safeNumber', () => {
    const contracts = [
      { id: 'c1', rent_amount: '7500' as unknown as number, fiscal_year_id: 'fy1' },
    ];
    expect(computeContractualRevenue(contracts, [])).toBe(7500);
  });

  it('handles null/undefined amounts gracefully', () => {
    const contracts = [
      { id: 'c1', rent_amount: null, fiscal_year_id: 'fy1' },
      { id: 'c2', rent_amount: undefined, fiscal_year_id: 'fy1' },
      { id: 'c3', rent_amount: 1000, fiscal_year_id: 'fy1' },
    ];
    expect(computeContractualRevenue(contracts, [])).toBe(1000);
  });
});
