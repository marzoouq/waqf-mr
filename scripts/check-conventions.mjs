#!/usr/bin/env node
/**
 * check-conventions.mjs — حارس قواعد المعمارية للمشروع
 *
 * يفشل عند:
 *   1. console.* خارج src/lib/logger.ts
 *   2. استيراد supabase داخل src/pages/
 *   3. استخدام localStorage لمفتاح fiscal_year
 *   4. ملفات > 250 سطر في components/ أو pages/ أو hooks/
 *   5. استيراد sonner أو supabase داخل src/utils/
 *
 * شغّل عبر: npm run lint:conventions
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const violations = [];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(p))) out.push(p);
  }
  return out;
}

const files = walk(SRC);

for (const file of files) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const isTest = /\.test\.tsx?$/.test(rel);

  // 1) console.* — مسموح فقط في logger.ts
  if (!rel.endsWith('src/lib/logger.ts') && !isTest) {
    lines.forEach((line, i) => {
      if (/^\s*console\.(log|warn|error|info|debug)\(/.test(line) && !line.includes('eslint-disable')) {
        violations.push(`${rel}:${i + 1} — console.* محظور (استخدم logger من @/lib/logger)`);
      }
    });
  }

  // 2) supabase داخل pages/ — يجب أن يمر عبر hooks/data
  if (rel.startsWith('src/pages/') && !isTest) {
    lines.forEach((line, i) => {
      if (/from ['"]@\/integrations\/supabase\/client['"]/.test(line)) {
        violations.push(`${rel}:${i + 1} — استيراد supabase من pages/ محظور (استخدم hooks/data)`);
      }
    });
  }

  // 3) localStorage مع fiscal_year
  lines.forEach((line, i) => {
    if (/localStorage[^.]*fiscal_year/.test(line) && !line.trim().startsWith('//')) {
      violations.push(`${rel}:${i + 1} — استخدم sessionStorage لـ fiscal_year_id`);
    }
  });

  // 4) sonner / supabase داخل utils/ — utils يجب أن تكون نقية
  if (rel.startsWith('src/utils/') && !isTest) {
    lines.forEach((line, i) => {
      if (/from ['"]sonner['"]/.test(line)) {
        violations.push(`${rel}:${i + 1} — sonner محظور في utils/ (استخدم lib/notify)`);
      }
      if (/from ['"]@\/integrations\/supabase\/client['"]/.test(line)) {
        violations.push(`${rel}:${i + 1} — supabase محظور في utils/ (استخدم lib/services)`);
      }
    });
  }

  // 5) حجم الملف
  if (!isTest && (rel.startsWith('src/components/') || rel.startsWith('src/pages/') || rel.startsWith('src/hooks/'))) {
    if (lines.length > 250) {
      violations.push(`${rel} — ${lines.length} سطر (الحد 250). قسّم الملف.`);
    }
  }
}

if (violations.length > 0) {
  console.error(`\n✖ ${violations.length} مخالفة معمارية:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error('\nراجع mem://conventions/code-style-and-naming و mem://technical/architecture/core-modularization-standard-v7\n');
  process.exit(1);
}

console.log(`✔ لا مخالفات معمارية (${files.length} ملف مفحوص)`);
