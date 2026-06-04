/**
 * Round W — buttonHandlerAudit: يستهلك audit/ui-permissions-audit.csv
 *
 * يفشل إن وُجد أي GAP-* غير مدرج في whitelist موثق.
 * يُولَّد التقرير عبر: `node scripts/audit-ui-permissions.mjs`
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CSV_PATH = resolve(process.cwd(), 'audit/ui-permissions-audit.csv');

/** Whitelist موثق صراحة لكل استثناء (file:line → سبب). */
const WHITELIST = new Set<string>([
  // أضف هنا "file:line" مع تعليق سبب الاستثناء عند الحاجة.
]);

describe('Round W — Button & Link Handler Audit', () => {
  it('ملف التقرير موجود — شغّل `node scripts/audit-ui-permissions.mjs`', () => {
    expect(existsSync(CSV_PATH), 'audit/ui-permissions-audit.csv مفقود').toBe(true);
  });

  it('لا توجد GAP-* خارج الـ whitelist', () => {
    if (!existsSync(CSV_PATH)) return;
    const lines = readFileSync(CSV_PATH, 'utf8').trim().split('\n').slice(1);
    const gaps = lines
      .filter(l => l.length > 0)
      .map(l => {
        const [file, line, , status] = l.split(',');
        return { key: `${file}:${line}`, status: status ?? '' };
      })
      .filter(g => !WHITELIST.has(g.key));
    expect(gaps, `فجوات بدون توثيق: ${gaps.map(g => `${g.status} @ ${g.key}`).join(' | ')}`).toEqual([]);
  });
});
