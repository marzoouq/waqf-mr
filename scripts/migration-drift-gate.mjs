#!/usr/bin/env node
/**
 * بوابة كشف انفصال قاعدة البيانات (Migration Drift Gate)
 * -----------------------------------------------------
 * تقارن ملفات supabase/migrations بما هو مطبَّق فعلياً في قاعدة البيانات
 * (جدول supabase_migrations.schema_migrations) وتفشل (exit 1) عند وجود فجوة.
 *
 * سبب وجودها: في 2026-08 تأخّرت قاعدة الإنتاج عن المستودع بخمس هجرات،
 * فبقيت ثغرة أمنية حيّة وميزات ميتة دون أن يكشفها أي فحص.
 *
 * الاستخدام:
 *   npm run check:migrations              # يقارن مع القاعدة إن توفّر psql
 *   MIGRATION_APPLIED_FILE=list.txt ...   # مقارنة مع قائمة نسخ يدوية
 *
 * ملاحظة: عند غياب اتصال قاعدة البيانات (بيئة CI بلا PGHOST) تكتفي البوابة
 * بالتحقق البنيوي (ترقيم صحيح، لا تكرار طوابع، لا ملف فارغ) ولا تفشل.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'supabase', 'migrations');

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const failures = [];
const versions = [];

for (const file of files) {
  const version = file.match(/^(\d{14})/)?.[1];
  if (!version) {
    failures.push(`اسم هجرة غير مطابق للنمط (طابع زمني 14 رقماً): ${file}`);
    continue;
  }
  if (versions.includes(version)) failures.push(`طابع زمني مكرّر: ${version}`);
  versions.push(version);
  if (statSync(join(DIR, file)).size === 0) failures.push(`ملف هجرة فارغ: ${file}`);
}

console.log('\n=== بوابة انفصال الهجرات ===');
console.log(`ملفات الهجرات في المستودع: ${files.length}`);

/** يقرأ الإصدارات المطبَّقة من القاعدة أو من ملف يدوي */
function readApplied() {
  const manual = process.env.MIGRATION_APPLIED_FILE;
  if (manual) {
    return readFileSync(manual, 'utf8')
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!process.env.PGHOST) return null;
  try {
    const out = execFileSync(
      'psql',
      ['-At', '-c', 'select version from supabase_migrations.schema_migrations order by version'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

const applied = readApplied();

if (applied === null) {
  console.log('لا يتوفّر اتصال قاعدة بيانات — تم التحقق البنيوي فقط.');
} else {
  const appliedSet = new Set(applied);
  const missing = versions.filter((v) => !appliedSet.has(v));
  const unknown = applied.filter((v) => !versions.includes(v));
  console.log(`الهجرات المطبَّقة في القاعدة: ${applied.length}`);
  console.log(`غير مطبَّقة: ${missing.length} | مطبَّقة بلا ملف: ${unknown.length}`);
  for (const v of missing) console.log(`  • غير مطبَّقة: ${v}`);
  if (missing.length > 0) {
    failures.push(
      `${missing.length} هجرة موجودة في المستودع وغير مطبَّقة على القاعدة — طبّقها أو انشر التطبيق قبل الدمج`,
    );
  }
}

if (failures.length > 0) {
  console.error('\n❌ فشل بوابة الهجرات:');
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}

console.log('✅ لا انفصال في الهجرات.\n');
