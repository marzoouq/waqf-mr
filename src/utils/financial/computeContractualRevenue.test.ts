import { describe, it, expect } from 'vitest';
import { computeContractualRevenue } from '@/utils/financial/computeContractualRevenue';

describe('computeContractualRevenue', () => {
  it('يستخدم مجموع المخصصات عند توفرها (الأولوية 1)', () => {
    const contracts = [{ id: 'c1', rent_amount: 100000, fiscal_year_id: 'fy-2025' }];
    const allocations = [
      { contract_id: 'c1', fiscal_year_id: 'fy-2025', allocated_amount: 70000 },
      { contract_id: 'c2', fiscal_year_id: 'fy-2025', allocated_amount: 30000 },
    ];
    expect(computeContractualRevenue(contracts, allocations)).toBe(100000);
  });

  it('يقع على fallback إلى rent_amount عند غياب المخصصات', () => {
    const contracts = [
      { id: 'c1', rent_amount: 50000, fiscal_year_id: 'fy-2024' },
      { id: 'c2', rent_amount: 75000, fiscal_year_id: 'fy-2024' },
    ];
    expect(computeContractualRevenue(contracts, [])).toBe(125000);
  });

  it('لا يخلط بين السنوات — يعتمد فقط على المدخلات الممرّرة', () => {
    // المتصل مسؤول عن تمرير عقود/مخصصات السنة المختارة فقط؛
    // الدالة لا تُضيف ولا تُسرّب أي عقد لم يُمرّر إليها.
    const contracts: { id: string; rent_amount: number }[] = [];
    const allocations: { allocated_amount: number }[] = [];
    expect(computeContractualRevenue(contracts, allocations)).toBe(0);
  });

  it('يتجاهل القيم الفارغة/غير الصالحة بأمان', () => {
    const contracts = [
      { id: 'c1', rent_amount: null },
      { id: 'c2', rent_amount: '40000' as unknown as number },
    ];
    expect(computeContractualRevenue(contracts, [])).toBe(40000);
  });
});
