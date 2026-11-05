import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');
const nav = read('src/constants/navigation.ts');
const page = (n: string) => read(`src/pages/dashboard/${n}.tsx`);

describe('visual identity guard', () => {
  it.each([
    ['/dashboard/income', 'TrendingUp', 'IncomePage', 'الدخل'],
    ['/dashboard/expenses', 'TrendingDown', 'ExpensesPage', 'المصروفات'],
    ['/dashboard/annual-report', 'Trophy', 'AnnualReportPage', 'إدارة التقرير السنوي'],
    ['/dashboard/official-letters', 'FileSignature', 'OfficialLettersPage', 'الوثائق المعتمدة'],
  ])('%s: menu icon and page header match', (route, icon, file, title) => {
    expect(nav).toContain(`'${route}': ${icon},`);
    const src = page(file);
    expect(src).toContain(`title="${title}"`);
    expect(src).toMatch(new RegExp(`icon=\\{${icon}\\}`));
  });

  it.each(['SystemDiagnosticsPage', 'EmailMonitorPage', 'AnnualReportPage'])('%s uses the shared header with actions', (f) => {
    const src = page(f);
    expect(src).toContain('<PageHeaderCard');
    expect(src).not.toMatch(/<h1[\s>]/);
    expect(src).toContain('actions={');
  });

  it('invoice templates follow dark mode (no fixed white card)', () => {
    for (const f of ['SimplifiedTemplate', 'ProfessionalTemplate']) {
      expect(read(`src/components/invoices/templates/${f}.tsx`)).not.toMatch(/"bg-white dark:bg-card/);
    }
  });
});
