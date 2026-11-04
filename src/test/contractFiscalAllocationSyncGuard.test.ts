/**
 * حارس: مخصصات العقد للسنة المالية تُشتق من فواتيره الفعلية عبر مشغّل خادمي،
 * فلا تنفصل بطاقة العقار عن الفواتير (حادثة العقار 101: 14,850 بدل 16,200).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePropertyFinancials } from '@/hooks/domain/financial/usePropertyFinancials';

const dir = join(process.cwd(), 'drizzle/migrations');
const allSql = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(dir, f), 'utf8'))
  .join('\n');

describe('contract fiscal allocation sync', () => {
  it('defines a SECURITY DEFINER sync function', () => {
    expect(allSql).toMatch(/FUNCTION public\.sync_contract_fiscal_allocations[\s\S]*SECURITY DEFINER/);
  });
  it('fires on insert, update and delete of payment invoices', () => {
    expect(allSql).toMatch(
      /AFTER INSERT OR UPDATE OR DELETE ON public\.payment_invoices[\s\S]*sync_contract_fiscal_allocations/,
    );
  });
  it('12 invoices of 1,350 show 16,200 and 1,350 monthly on the property card', () => {
    const f = computePropertyFinancials({
      propertyId: 'p101',
      contracts: [{ id: 'c1', property_id: 'p101', status: 'active', rent_amount: 16200 }],
      expenses: [],
      units: [],
      isSpecificYear: true,
      allocationMap: new Map([['c1', { allocated_amount: 16200 }]]),
    });
    expect(f.contractualRevenue).toBe(16200);
    expect(f.monthlyRent).toBe(1350);
  });
});
