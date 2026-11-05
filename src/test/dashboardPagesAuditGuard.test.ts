/**
 * حارس فحص الصفحات الاثنتي عشرة: حالة الخطأ، روابط الواقف، وأساس حصص المستفيدين.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { WAQIF_HIDDEN_ROUTES } from '@/constants/navigation';
import { computeDistributionBase, shareOf } from '@/utils/financial/distribution/distributionBase';

const read = (p: string) => readFileSync(p, 'utf8');

describe('dashboard pages audit guard', () => {
  it('كل صفحة تعرض حالة خطأ عند فشل التحميل', () => {
    for (const f of ['IncomePage', 'ExpensesPage', 'BeneficiariesPage', 'ChartOfAccountsPage', 'ReportsPage']) {
      expect(read(`src/pages/dashboard/${f}.tsx`), f).toMatch(/isError\) return <ErrorState/);
    }
    expect(read('src/hooks/page/admin/reports/useReportsData.ts')).not.toMatch(/_isError/);
    expect(read('src/pages/dashboard/OfficialLettersPage.tsx')).toMatch(/h\.isError/);
    expect(read('src/components/reports/OverdueTenantsReport.tsx')).toMatch(/invoicesError/);
  });

  it('روابط الواقف المخفية هي بالضبط المسارات التي ترفضه', () => {
    const routes = read('src/routes/beneficiaryRoutes.tsx');
    for (const to of WAQIF_HIDDEN_ROUTES) {
      const line = routes.split('\n').find(l => l.includes(`"${to.replace('/beneficiary/', '')}"`) || l.includes(`'${to}'`) || l.includes(`"${to}"`));
      expect(line, to).toBeDefined();
      expect(line, to).toMatch(/BENEFICIARY_ROLES/);
    }
    expect(WAQIF_HIDDEN_ROUTES.size).toBe(6);
  });

  it('ملفا الإفصاح والتوزيع يحسبان الحصة من المبلغ المقرر', () => {
    const base = computeDistributionBase(1_384_986.63, 1_000_000).base;
    expect(shareOf(base, 6.25, 100)).toBe(62_500);
    const src = read('src/hooks/page/admin/financial/useAccountsExports.ts');
    expect(src).not.toMatch(/input\.availableAmount \* pct/);
  });
});
