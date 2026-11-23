import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getEffectiveContractStatus } from '@/utils/contracts/contractStatus';
import { buildCarryForwardRows } from '@/utils/pdf/reports/comprehensiveBeneficiaryFinancial';
import type { ComprehensiveBeneficiaryData } from '@/utils/pdf/reports/comprehensiveBeneficiary';

const base = { totalIncome: 1756900, waqfCorpusPrevious: 107913.2 } as ComprehensiveBeneficiaryData;

describe('السنة المقفلة مجمّدة والتصحيحات للسنوات القادمة', () => {
  it('العقد المنتهي تاريخه يظهر «منتهي» دون تعديل البيانات', () => {
    expect(getEffectiveContractStatus('active', '2026-10-31', '2026-11-23')).toBe('expired');
    expect(getEffectiveContractStatus('active', '2027-08-30', '2026-11-23')).toBe('active');
    expect(getEffectiveContractStatus('cancelled', '2026-01-01', '2026-11-23')).toBe('cancelled');
  });

  it('التقرير الشامل لا يضيف أسطراً للسنة المقفلة', () => {
    expect(buildCarryForwardRows({ ...base, isFiscalYearActive: false })).toEqual([]);
  });

  it('التقرير الشامل يضيف المرحّل والإجمالي الشامل للسنة المفتوحة', () => {
    const rows = buildCarryForwardRows({ ...base, isFiscalYearActive: true });
    expect(rows).toHaveLength(2);
    expect(rows[1]?.[1]).toContain('1,864,813.2');
  });

  it('لا يُطبع إجمالي مدمج للمصروفات والضريبة في السنوات المفتوحة', () => {
    const src = readFileSync('src/components/beneficiary/disclosure/DisclosureExpensesBlock.tsx', 'utf8');
    const openBranch = src.slice(src.indexOf(') : ('));
    expect(openBranch).not.toContain('إجمالي المصروفات والضريبة');
    expect(openBranch).not.toContain('totalExpenses - vatAmount');
  });

  it('المهمة الليلية لا تكتب في السنة المقفلة', () => {
    const sql = readFileSync('drizzle/migrations/0032_future_years_pct_and_skip_closed_contract_expiry.sql', 'utf8');
    expect(sql).toMatch(/fy\.status = 'closed'/);
    expect(sql).toMatch(/v_fy\.status <> 'closed' THEN\s+BEGIN\s+v_admin_share_pct/);
  });
});
