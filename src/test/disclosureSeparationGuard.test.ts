/**
 * حارس الإفصاح السنوي:
 * - البيان المالي التفصيلي يبقى كاملاً (إيرادات، مصروفات، تسلسل الريع، حصتي).
 * - المصروفات التشغيلية والضريبة بندان مستقلان: لا طرح ولا إجمالي مدمج.
 * - العقود ملخص تشغيلي فقط: لا أسماء مستأجرين ولا أرقام عقود في الإفصاح وPDF الشامل.
 * - الأرقام المعتمدة لسنة 2025-2026 المقفلة تبقى كما صدرت.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { summarizeDisclosureContracts } from '@/utils/contracts/disclosureContractsSummary';

const read = (p: string) => readFileSync(p, 'utf8');
const DISCLOSURE_FILES = [
  'src/components/beneficiary/disclosure/DisclosureExpensesBlock.tsx',
  'src/components/beneficiary/disclosure/DisclosureSummaryCards.tsx',
  'src/components/beneficiary/disclosure/DisclosureFinancialStatement.tsx',
  'src/components/beneficiary/disclosure/DisclosureWaterfallBlock.tsx',
  'src/utils/pdf/reports/comprehensiveBeneficiaryTables.ts',
  'src/utils/pdf/reports/comprehensiveBeneficiaryFinancial.ts',
  'src/utils/pdf/entities/beneficiary.ts',
  'src/components/reports/AnnualDisclosureTable.tsx',
];

describe('فصل المصروفات التشغيلية عن الضريبة', () => {
  it.each(DISCLOSURE_FILES)('%s لا يطرح الضريبة من المصروفات ولا يدمجهما', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/totalExpenses\s*-\s*vatAmount/);
    expect(src).not.toContain('إجمالي المصروفات والضريبة');
  });

  it('كتلة المصروفات تعرض الإجمالي الرسمي كما يصل بلا جمع في الواجهة', () => {
    const src = read('src/components/beneficiary/disclosure/DisclosureExpensesBlock.tsx');
    expect(src).toContain('{fmt(totalExpenses)}');
    expect(src).not.toContain('.reduce(');
    expect(src).toContain('ضريبة القيمة المضافة');
  });

  it('بطاقات الإفصاح: «المصروفات التشغيلية» وبطاقة ضريبة مستقلة', () => {
    const src = read('src/components/beneficiary/disclosure/DisclosureSummaryCards.tsx');
    expect(src).toContain('label="المصروفات التشغيلية" value={totalExpenses}');
    expect(src).toContain('label="ضريبة القيمة المضافة" value={vatAmount}');
  });

  it('التسلسل المعتمد لسنة 2025-2026: المصروفات ثم الضريبة كلٌّ على حدة', () => {
    const grandTotal = 1_864_813.2;
    const expenses = 127_984.44;
    const vat = 107_504.82;
    const netAfterExpenses = Math.round((grandTotal - expenses) * 100) / 100;
    const netAfterVat = Math.round((netAfterExpenses - vat) * 100) / 100;
    expect(netAfterExpenses).toBe(1_736_828.76);
    expect(netAfterVat).toBe(1_629_323.94);
  });
});

describe('البيان المالي التفصيلي يبقى كما هو', () => {
  it('يحتوي الإيرادات والمصروفات وتسلسل الريع وحصتي', () => {
    const src = read('src/components/beneficiary/disclosure/DisclosureFinancialStatement.tsx');
    expect(src).toContain('البيان المالي التفصيلي');
    for (const block of ['<DisclosureIncomeBlock', '<DisclosureExpensesBlock', '<DisclosureWaterfallBlock', '<DisclosureMyShareCard']) {
      expect(src).toContain(block);
    }
  });
});

describe('العقود في الإفصاح ملخص تشغيلي فقط', () => {
  it.each([
    'src/components/beneficiary/disclosure/DisclosureContractsSection.tsx',
    'src/utils/pdf/reports/comprehensiveBeneficiaryTables.ts',
    'src/utils/pdf/reports/comprehensiveBeneficiary.ts',
  ])('%s لا يعرض أسماء المستأجرين ولا أرقام العقود', (file) => {
    const src = read(file);
    expect(src).not.toContain('tenant_name');
    expect(src).not.toContain('contract_number');
  });

  it('العدادات والقيمة السنوية تطابق عقود 2025-2026 (15 منتهٍ و4 نشطة)', () => {
    const today = '2026-11-23';
    const contracts = [
      ...Array.from({ length: 15 }, () => ({ status: 'active', end_date: '2026-10-31', rent_amount: 100_000 })),
      ...Array.from({ length: 4 }, () => ({ status: 'active', end_date: '2027-08-30', rent_amount: 69_700 })),
    ];
    expect(summarizeDisclosureContracts(contracts, today)).toEqual({
      total: 19, active: 4, expired: 15, cancelled: 0, annualValue: 1_778_800,
    });
  });

  it('العقد الملغى يُعدّ منفصلاً ولا يدخل في القيمة السنوية', () => {
    const s = summarizeDisclosureContracts([
      { status: 'cancelled', end_date: '2027-01-01', rent_amount: 50_000 },
      { status: 'expired', end_date: '2025-01-01', rent_amount: '20000' },
    ], '2026-11-23');
    expect(s).toEqual({ total: 2, active: 0, expired: 1, cancelled: 1, annualValue: 20_000 });
  });
});
