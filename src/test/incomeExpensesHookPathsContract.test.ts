/**
 * عقد المسارات (post-Core Modularization v7):
 * يضمن أن صفحتَي الدخل والمصروفات + ملفّات الاختبار تستهلكان
 * مسارات hooks الجديدة فقط، ولا تسرّب للمسارات القديمة.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

interface PathContract {
  file: string;
  required: string[];
  forbidden: string[];
}

const CONTRACTS: PathContract[] = [
  {
    file: 'src/hooks/page/admin/financial/useIncomePage.ts',
    required: [
      '@/hooks/data/financial/income/useIncome',
      '@/hooks/data/properties/useProperties',
      '@/hooks/data/contracts/useContracts',
      '@/hooks/data/invoices/usePaymentInvoices',
      '@/hooks/data/settings/waqf/usePdfWaqfInfo',
      '@/hooks/auth/session/useAuthContext',
    ],
    forbidden: [
      '@/hooks/data/useIncome',
      '@/hooks/data/useProperties',
      '@/hooks/data/useContracts',
      '@/hooks/data/usePaymentInvoices',
      '@/hooks/data/usePdfWaqfInfo',
    ],
  },
  {
    file: 'src/hooks/page/admin/financial/useExpensesPage.ts',
    required: [
      '@/hooks/data/financial/expenses/useExpenses',
      '@/hooks/data/invoices/useInvoices',
      '@/hooks/data/properties/useProperties',
      '@/hooks/data/settings/waqf/usePdfWaqfInfo',
      '@/hooks/auth/session/useAuthContext',
    ],
    forbidden: [
      '@/hooks/data/useExpenses',
      '@/hooks/data/useInvoices',
      '@/hooks/data/useProperties',
      '@/hooks/data/usePdfWaqfInfo',
    ],
  },
  {
    file: 'src/pages/dashboard/IncomePage.test.tsx',
    required: [
      '@/hooks/data/financial/income/useIncome',
      '@/hooks/data/properties/useProperties',
      '@/hooks/data/contracts/useContracts',
      '@/hooks/data/invoices/usePaymentInvoices',
      '@/hooks/data/settings/waqf/usePdfWaqfInfo',
      '@/hooks/auth/session/useAuthContext',
    ],
    forbidden: [
      "vi.mock('@/hooks/data/useIncome'",
      "vi.mock('@/hooks/data/useProperties'",
      "vi.mock('@/hooks/data/useContracts'",
      "vi.mock('@/hooks/data/usePaymentInvoices'",
      "vi.mock('@/hooks/data/usePdfWaqfInfo'",
    ],
  },
  {
    file: 'src/pages/dashboard/ExpensesPage.test.tsx',
    required: [
      '@/hooks/data/financial/expenses/useExpenses',
      '@/hooks/data/invoices/useInvoices',
      '@/hooks/data/properties/useProperties',
      '@/hooks/data/settings/waqf/usePdfWaqfInfo',
      '@/hooks/auth/session/useAuthContext',
    ],
    forbidden: [
      "vi.mock('@/hooks/data/useExpenses'",
      "vi.mock('@/hooks/data/useInvoices'",
      "vi.mock('@/hooks/data/useProperties'",
      "vi.mock('@/hooks/data/usePdfWaqfInfo'",
    ],
  },
];

describe('Income/Expenses hook-paths contract (post-v7)', () => {
  it.each(CONTRACTS)('$file تستهلك المسارات الجديدة فقط', ({ file, required, forbidden }) => {
    const content = read(file);
    for (const path of required) {
      expect(content, `${file} يجب أن يستورد ${path}`).toContain(path);
    }
    for (const path of forbidden) {
      expect(content, `${file} يجب ألا يحتوي على ${path}`).not.toContain(path);
    }
  });
});
