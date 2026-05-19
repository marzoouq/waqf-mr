/**
 * حارس انحدار معماري: صفحات الفواتير وصفحات المصروفات منفصلة تماماً.
 * - InvoicesPage/InvoicesViewPage لا تستورد من components/expenses أو useExpensesPage.
 * - ExpensesPage/ExpensesViewPage لا تستورد من components/invoices أو useInvoicesPage.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const PAIRS: Array<{ file: string; forbidden: RegExp[] }> = [
  {
    file: 'src/pages/dashboard/InvoicesPage.tsx',
    forbidden: [/from\s+['"]@\/components\/expenses\//, /useExpensesPage/],
  },
  {
    file: 'src/pages/dashboard/ExpensesPage.tsx',
    forbidden: [/from\s+['"]@\/components\/invoices\//, /useInvoicesPage/],
  },
  {
    file: 'src/pages/beneficiary/InvoicesViewPage.tsx',
    forbidden: [/from\s+['"]@\/components\/expenses\//, /useExpensesViewPage/],
  },
  {
    file: 'src/pages/beneficiary/ExpensesViewPage.tsx',
    forbidden: [/from\s+['"]@\/components\/invoices\//, /useInvoicesViewPage/],
  },
];

describe('Invoices ↔ Expenses decoupling', () => {
  it.each(PAIRS)('$file لا يكسر حدود الفصل', ({ file, forbidden }) => {
    const content = read(file);
    for (const pattern of forbidden) {
      expect(content, `${file} should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});
