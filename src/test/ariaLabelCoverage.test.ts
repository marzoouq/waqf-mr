/**
 * تغطية aria-label و handlers — فحص ثابت لكل ملفات pages/components الحرجة.
 * يفشل إن وُجد زر size="icon" بدون aria-label أو زر بدون onClick/submit/asChild في تلك المسارات.
 * المعيار مشترك مع لوحة التشخيص عبر src/lib/diagnostics/buttonScan.ts — لا نسخة ثانية هنا.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { sync as glob } from 'fast-glob';
import { findHandlerLessButtons, findIconButtonsMissingAria } from '@/lib/diagnostics/buttonScan';

const ROOTS = ['src/pages', 'src/components/diagnostics', 'src/components/layout'];

function loadFiles(): { file: string; src: string }[] {
  const root = process.cwd();
  const files = ROOTS.flatMap((r) =>
    glob(`${r}/**/*.tsx`, { cwd: root, ignore: ['**/*.test.tsx', '**/*.spec.tsx'], absolute: true }),
  );
  return files.map((f) => ({ file: relative(root, f), src: readFileSync(f, 'utf8') }));
}

describe('aria-label coverage in pages, diagnostics, layout', () => {
  const files = loadFiles();

  it('every icon-only Button has aria-label (or parent Link with aria-label)', () => {
    const offenders: string[] = [];
    for (const { file, src } of files) {
      for (const tag of findIconButtonsMissingAria(src)) offenders.push(`${file} :: ${tag.slice(0, 120)}`);
    }
    expect(offenders, `أزرار أيقونة بدون aria-label:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  it('every Button has a handler (onClick/submit/asChild/disabled/wrapping Link or Trigger)', () => {
    const offenders: string[] = [];
    for (const { file, src } of files) {
      for (const tag of findHandlerLessButtons(src)) offenders.push(`${file} :: ${tag.slice(0, 120)}`);
    }
    expect(offenders, `أزرار بدون معالج:\n${offenders.join('\n')}`).toHaveLength(0);
  });
});

describe('file size budget', () => {
  const BUDGETS: Array<{ root: string; max: number }> = [
    { root: 'src/pages', max: 200 },
    { root: 'src/hooks', max: 180 },
    { root: 'src/components', max: 250 },
  ];

  // ملفات سابقة تتجاوز الميزانية — مسموح بها مؤقتاً (يجب تقليصها مستقبلاً، لكنها ليست regression)
  const LEGACY_ALLOWLIST = new Set<string>([
    'src/hooks/page/admin/financial/useCreateInvoiceForm.ts',
    'src/hooks/page/admin/financial/useExpensesPage.ts',
    'src/hooks/page/admin/financial/useIncomePage.ts',
  ]);

  for (const { root, max } of BUDGETS) {
    it(`${root}/** files do not exceed ${max} lines (allowlist for legacy)`, () => {
      const files = glob(`${root}/**/*.{ts,tsx}`, { cwd: process.cwd(), ignore: ['**/*.test.{ts,tsx}'], absolute: true });
      const violators = files
        .map((f) => ({ file: relative(process.cwd(), f), lines: readFileSync(f, 'utf8').split('\n').length }))
        .filter((x) => x.lines > max && !LEGACY_ALLOWLIST.has(x.file.replace(/\\/g, '/')));
      const list = violators.map((v) => `${v.file} (${v.lines})`).join('\n');
      expect(violators, `ملفات جديدة تجاوزت الحد ${max}:\n${list}`).toHaveLength(0);
    });
  }
});
