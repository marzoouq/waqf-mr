/**
 * اختبار انحدار: InvoiceSourceFilter استخدم 'purchase' (وليس 'expense')
 * لفصل دلالة فاتورة الشراء (مستند ZATCA) عن سجل المصروف التشغيلي.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { InvoiceSourceFilter, UnifiedInvoiceItem } from '@/types/invoices';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('InvoiceSourceFilter - purchase rename', () => {
  it('يقبل القيم الجديدة فقط (type-level)', () => {
    const a: InvoiceSourceFilter = 'all';
    const p: InvoiceSourceFilter = 'purchase';
    const r: InvoiceSourceFilter = 'rent';
    expect([a, p, r]).toEqual(['all', 'purchase', 'rent']);
    const item: UnifiedInvoiceItem['source'] = 'purchase';
    expect(item).toBe('purchase');
  });

  it('ملف الأنواع لا يحوي القيمة القديمة expense ضمن source/فلتر', () => {
    const src = read('src/types/invoices.ts');
    expect(src).not.toMatch(/source:\s*['"]expense['"]/);
    expect(src).not.toMatch(/['"]all['"]\s*\|\s*['"]expense['"]/);
  });

  const filesToCheck = [
    'src/hooks/page/admin/financial/useInvoicesPage.ts',
    'src/hooks/page/beneficiary/financial/useInvoicesViewPage.ts',
    'src/pages/dashboard/InvoicesPage.tsx',
    'src/pages/beneficiary/InvoicesViewPage.tsx',
  ];

  it.each(filesToCheck)('لا يستخدم قيمة "expense" كمصدر فلتر في %s', (path) => {
    const content = read(path);
    // ممنوع: source === 'expense' أو source: 'expense' أو 'expense' كحرفية فلتر
    expect(content).not.toMatch(/source\s*===\s*['"]expense['"]/);
    expect(content).not.toMatch(/source:\s*['"]expense['"]/);
    expect(content).not.toMatch(/sourceFilter\s*===\s*['"]expense['"]/);
    // ممنوع: <TabsTrigger value="expense"> — يجب أن يطابق نوع 'purchase'
    expect(content).not.toMatch(/<TabsTrigger\s+value=["']expense["']/);
  });
});
