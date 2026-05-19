/**
 * عزل مكوّنات الواجهات: صفحات الفواتير لا تستورد مكوّنات المصروفات والعكس،
 * وصفحات المستفيد لا تستورد مكوّنات خاصة بصفحات الناظر (مثل dialogs التعديل).
 * يحمي الفصل المعماري بعد إعادة هيكلة الفواتير/المصروفات.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

interface IsolationCase {
  file: string;
  forbiddenImports: RegExp[];
}

const CASES: IsolationCase[] = [
  {
    file: 'src/pages/dashboard/InvoicesPage.tsx',
    forbiddenImports: [/from\s+['"]@\/components\/expenses/, /from\s+['"]@\/hooks\/page\/admin\/financial\/useExpensesPage/],
  },
  {
    file: 'src/pages/dashboard/ExpensesPage.tsx',
    forbiddenImports: [/from\s+['"]@\/components\/invoices/, /from\s+['"]@\/hooks\/page\/admin\/financial\/useInvoicesPage/],
  },
  {
    file: 'src/pages/beneficiary/InvoicesViewPage.tsx',
    forbiddenImports: [
      /from\s+['"]@\/components\/expenses/,
      /InvoicesPageDialogs/,
      /InvoiceUploadDialog/,
      /InvoiceFormDialog/,
      /from\s+['"]@\/hooks\/page\/admin\//,
    ],
  },
  {
    file: 'src/pages/beneficiary/ExpensesViewPage.tsx',
    forbiddenImports: [
      /from\s+['"]@\/components\/invoices/,
      /ExpenseFormDialog/,
      /from\s+['"]@\/hooks\/page\/admin\//,
    ],
  },
];

describe('Surface component isolation', () => {
  it.each(CASES)('$file لا تستورد مكوّنات الواجهة الأخرى', ({ file, forbiddenImports }) => {
    const content = read(file);
    for (const re of forbiddenImports) {
      expect(content, `${file} must not match ${re}`).not.toMatch(re);
    }
  });
});
