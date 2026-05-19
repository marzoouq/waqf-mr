/**
 * عقد التقارير: لا يوجد تسرّب لمفهوم `'expense'` كقيمة فلتر مصدر الفواتير،
 * ولا تستهلك hooks التقارير `InvoiceSourceFilter`. الإفصاح/الحساب الختامي/التوزيع
 * تعتمد على جدول expenses الخام عبر useRawFinancialData — مستقلة عن نوع الفاتورة.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const REPORT_FILES = [
  'src/hooks/page/admin/reports/useReportsData.ts',
  'src/hooks/page/admin/reports/useReportsExport.ts',
  'src/hooks/page/admin/reports/useAnnualReportPage.ts',
  'src/hooks/page/admin/financial/useAccountsPage.ts',
  'src/utils/pdf/reports/reports.ts',
  'src/utils/pdf/reports/annualReportPdf.ts',
  'src/utils/pdf/reports/annualDisclosurePdf.ts',
  'src/utils/pdf/entities/distributionsPdf.ts',
];

describe('Reports purchase-source contract', () => {
  it.each(REPORT_FILES)('%s لا يستورد InvoiceSourceFilter', (file) => {
    const content = read(file);
    expect(content).not.toMatch(/InvoiceSourceFilter/);
  });

  it.each(REPORT_FILES)('%s لا يستخدم \'expense\' كقيمة فلتر source', (file) => {
    const content = read(file);
    // أنماط ممنوعة: source: 'expense' / source === 'expense' / "expense" داخل sourceFilter
    expect(content).not.toMatch(/source\s*[:=]+\s*['"]expense['"]/);
    expect(content).not.toMatch(/sourceFilter\s*[:=]+\s*['"]expense['"]/);
  });

  it('InvoiceSourceFilter يقتصر على purchase|rent|all', () => {
    const types = read('src/types/invoices.ts');
    expect(types).toMatch(/InvoiceSourceFilter/);
    expect(types).toMatch(/'purchase'/);
    expect(types).toMatch(/'rent'/);
    expect(types).not.toMatch(/InvoiceSourceFilter\s*=\s*[^;]*'expense'/);
  });
});
