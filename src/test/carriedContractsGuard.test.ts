import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('العقود المرحّلة للسنة الجديدة', () => {
  it('قائمة عقود السنة تشمل العقود التي لها تخصيص فيها لا عقود سنة الإنشاء فقط', () => {
    const src = readFileSync('src/hooks/data/contracts/useContracts.ts', 'utf8');
    expect(src).toContain("from('contract_fiscal_allocations')");
    expect(src).not.toContain(".eq('fiscal_year_id', fiscalYearId);");
  });
});
