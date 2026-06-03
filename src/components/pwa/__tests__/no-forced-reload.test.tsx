/**
 * حارس انحدار: يمنع إعادة إدخال `location.reload()` قسري في كود التطبيق.
 *
 * المنطق:
 *  - يفحص كل ملفات src/** (يستثني *.test.* و *.spec.*).
 *  - يبحث عن استدعاءات JS فعلية لـ `location.reload(`.
 *  - يستثني الـ allowlist (ملفات مُبرَّرة فقط).
 *
 * Allowlist:
 *  - `src/main.tsx`: يحوي `onclick="location.reload()"` داخل سلسلة HTML fallback
 *    تُحقن في #root عند فشل React boot. مبرّر لأنه fallback أخير لا يصل
 *    إليه إلا إذا فشل التطبيق كلياً.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

const ALLOWLIST = new Set<string>([
  // fallback HTML داخل innerHTML عند فشل React boot — ليس استدعاءً تشغيلياً
  'main.tsx',
  // زر استرجاع يدوي يضغطه المستخدم بعد ظهور شاشة الخطأ
  'components/common/ErrorBoundary.tsx',
  // استرداد من chunk load failure بعد نشر جديد (مرة واحدة فقط مع علم session)
  'lib/lazyWithRetry.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('no-forced-reload regression guard', () => {
  it('لا يوجد استدعاء location.reload() خارج allowlist', () => {
    const files = walk(SRC_ROOT);
    const offenders: string[] = [];
    const pattern = /\blocation\.reload\s*\(/;

    for (const file of files) {
      const relPath = relative(SRC_ROOT, file).split(sep).join('/');
      if (ALLOWLIST.has(relPath)) continue;
      const content = readFileSync(file, 'utf8');
      if (pattern.test(content)) {
        offenders.push(relPath);
      }
    }

    expect(
      offenders,
      `استدعاءات location.reload() مرفوضة في:\n${offenders.join('\n')}\n` +
        'لإعفاء ملف صراحةً أضف مساره إلى ALLOWLIST مع تعليق المبرر.',
    ).toEqual([]);
  });
});
