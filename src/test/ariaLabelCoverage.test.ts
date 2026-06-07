/**
 * تغطية aria-label و handlers — فحص ثابت لكل ملفات pages/components الحرجة.
 * يفشل إن وُجد زر size="icon" بدون aria-label أو زر بدون onClick/submit/asChild في تلك المسارات.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { sync as glob } from 'fast-glob';

const ROOTS = ['src/pages', 'src/components/diagnostics', 'src/components/layout'];

function extractButtonTags(source: string) {
  const out: Array<{ tag: string; start: number }> = [];
  const re = /<Button\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const start = m.index;
    let i = start + m[0].length;
    let depth = 0;
    let q: string | null = null;
    while (i < source.length) {
      const ch = source[i];
      if (q) { if (ch === '\\') { i += 2; continue; } if (ch === q) q = null; }
      else if (depth > 0) { if (ch === '{') depth++; else if (ch === '}') depth--; else if (ch === '"' || ch === "'" || ch === '`') q = ch; }
      else { if (ch === '{') depth++; else if (ch === '"' || ch === "'" || ch === '`') q = ch; else if (ch === '>') { out.push({ tag: source.slice(start, i + 1), start }); break; } }
      i++;
    }
  }
  return out;
}

function loadFiles(): { file: string; src: string }[] {
  const root = process.cwd();
  const files = ROOTS.flatMap((r) =>
    glob(`${r}/**/*.tsx`, { cwd: root, ignore: ['**/*.test.tsx'], absolute: true }),
  );
  return files.map((f) => ({ file: relative(root, f), src: readFileSync(f, 'utf8') }));
}

describe('aria-label coverage in pages, diagnostics, layout', () => {
  const files = loadFiles();

  it('every icon-only Button has aria-label (or parent Link with aria-label)', () => {
    const offenders: string[] = [];
    for (const { file, src } of files) {
      for (const { tag, start } of extractButtonTags(src)) {
        if (!/size=["'`]icon["'`]/.test(tag)) continue;
        if (/aria-label\s*=/.test(tag)) continue;
        const ctx = src.slice(Math.max(0, start - 300), start);
        if (/<Link\b[^>]*aria-label\s*=[^>]*>\s*$/.test(ctx)) continue;
        offenders.push(`${file} :: ${tag.slice(0, 120)}`);
      }
    }
    expect(offenders, `أزرار أيقونة بدون aria-label:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  it('every Button has a handler (onClick/submit/asChild/disabled/wrapping Link or Trigger)', () => {
    const offenders: string[] = [];
    for (const { file, src } of files) {
      for (const { tag, start } of extractButtonTags(src)) {
        if (/onClick\s*=/.test(tag)) continue;
        if (/type\s*=\s*["'`]submit["'`]/.test(tag)) continue;
        if (/\basChild\b/.test(tag)) continue;
        if (/\bdisabled\b/.test(tag)) continue;
        const ctx = src.slice(Math.max(0, start - 300), start);
        if (/<Link\b[^>]*>\s*$/.test(ctx)) continue;
        if (/asChild\b[^<]*>\s*$/.test(ctx)) continue;
        offenders.push(`${file} :: ${tag.slice(0, 120)}`);
      }
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

  for (const { root, max } of BUDGETS) {
    it(`${root}/** files do not exceed ${max} lines`, () => {
      const files = glob(`${root}/**/*.{ts,tsx}`, { cwd: process.cwd(), ignore: ['**/*.test.{ts,tsx}'], absolute: true });
      const violators = files
        .map((f) => ({ file: relative(process.cwd(), f), lines: readFileSync(f, 'utf8').split('\n').length }))
        .filter((x) => x.lines > max);
      const list = violators.map((v) => `${v.file} (${v.lines})`).join('\n');
      expect(violators, `ملفات تجاوزت الحد ${max}:\n${list}`).toHaveLength(0);
    });
  }
});
