/**
 * عقد اختبار: يمنع cross-role coupling بين hooks الواقف والمستفيد.
 * #M6 — أي استيراد مباشر بين النطاقين يعني أن المنطق المشترك يجب نقله
 * إلى `src/hooks/application/dashboard/` بدلاً منه.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walkFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walkFiles(full, files);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) files.push(full);
  }
  return files;
}

describe('Role hooks decoupling contract', () => {
  it('hooks/page/waqif/** must not import from @/hooks/page/beneficiary/**', () => {
    const files = walkFiles('src/hooks/page/waqif');
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (/from\s+['"]@\/hooks\/page\/beneficiary/.test(src)) offenders.push(f);
    }
    expect(offenders, `move shared logic to @/hooks/application/dashboard/`).toEqual([]);
  });

  it('hooks/page/beneficiary/** must not import from @/hooks/page/waqif/**', () => {
    const files = walkFiles('src/hooks/page/beneficiary');
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (/from\s+['"]@\/hooks\/page\/waqif/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
