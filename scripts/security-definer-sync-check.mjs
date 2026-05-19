#!/usr/bin/env node
/**
 * SECURITY DEFINER Allowlist Sync Check
 * --------------------------------------
 * يتحقق من تطابق ثلاثة مصادر للحقيقة:
 *   1) قاعدة البيانات (دوال `prosecdef = true` في schemas محددة).
 *   2) `ALLOWLIST_0029` و `ALLOWLIST_ANON` في `scripts/supabase-lint-check.mjs`.
 *   3) جدول الدوال في `docs/security/security-definer-allowlist.md`.
 *
 * فروق تُحتسب:
 *   - DB − (Script ∪ Doc) → دوال DB غير موثّقة.
 *   - Script − DB        → إدخالات سكربت متقادمة.
 *   - Doc − DB           → إدخالات توثيق متقادمة.
 *   - Script △ Doc       → اختلاف بين السكربت والتوثيق.
 *
 * متغيرات البيئة / CLI flags (CLI يطغى على Env):
 *   --check-doc | CHECK_DOC_SYNC          (افتراضي: true)
 *   --check-db | CHECK_DB_SYNC            (افتراضي: true)
 *   --schemas | DEFINER_SCHEMAS           (افتراضي: public)
 *   --name-pattern | DEFINER_NAME_PATTERN (افتراضي: .*)
 *   --exclude-pattern | DEFINER_EXCLUDE_PATTERN (افتراضي: ^$)
 *   --doc-path | ALLOWLIST_DOC_PATH       (افتراضي: docs/security/security-definer-allowlist.md)
 *   --strict | STRICT_MODE                (افتراضي: true)
 *   --report-json | REPORT_JSON_PATH      (افتراضي: فارغ)
 *
 * متطلبات البيئة لفحص DB:
 *   SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLOWLIST_0029, ALLOWLIST_ANON } from './supabase-lint-check.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── 1) قراءة الخيارات ───────────────────────────────────────
function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([\w-]+)(?:=(.*))?$/);
    if (m) args.set(m[1], m[2] ?? 'true');
  }
  return args;
}

function asBool(v, fallback) {
  if (v == null) return fallback;
  return /^(1|true|yes|on)$/i.test(String(v).trim());
}

const cli = parseArgs();
const opts = {
  checkDoc: asBool(cli.get('check-doc') ?? process.env.CHECK_DOC_SYNC, true),
  checkDb: asBool(cli.get('check-db') ?? process.env.CHECK_DB_SYNC, true),
  schemas: (cli.get('schemas') ?? process.env.DEFINER_SCHEMAS ?? 'public')
    .split(',').map((s) => s.trim()).filter(Boolean),
  namePattern: cli.get('name-pattern') ?? process.env.DEFINER_NAME_PATTERN ?? '.*',
  excludePattern: cli.get('exclude-pattern') ?? process.env.DEFINER_EXCLUDE_PATTERN ?? '^$',
  docPath: cli.get('doc-path') ?? process.env.ALLOWLIST_DOC_PATH
    ?? 'docs/security/security-definer-allowlist.md',
  strict: asBool(cli.get('strict') ?? process.env.STRICT_MODE, true),
  reportJson: cli.get('report-json') ?? process.env.REPORT_JSON_PATH ?? '',
};

console.log('⚙️  إعدادات فحص المزامنة:');
console.log(`   check-doc=${opts.checkDoc}  check-db=${opts.checkDb}  strict=${opts.strict}`);
console.log(`   schemas=[${opts.schemas.join(', ')}]`);
console.log(`   name-pattern=/${opts.namePattern}/  exclude-pattern=/${opts.excludePattern}/`);
console.log(`   doc-path=${opts.docPath}`);

// ─── 2) دمج السكربت Allowlist ─────────────────────────────────
const scriptSet = new Set([...ALLOWLIST_0029, ...ALLOWLIST_ANON]);

// ─── 3) قراءة التوثيق ─────────────────────────────────────────
let docSet = new Set();
if (opts.checkDoc) {
  const docFull = resolve(ROOT, opts.docPath);
  let md;
  try {
    md = readFileSync(docFull, 'utf8');
  } catch (e) {
    console.error(`❌ تعذّر قراءة ملف التوثيق: ${docFull}\n   ${e.message}`);
    process.exit(2);
  }
  // استخراج كل اسم دالة محاط بـ ` داخل أعمدة جدول.
  // يقبل: `fn_name`، `fn_name(...)`، `fn_name()`، وعدة أسماء في خلية واحدة.
  const rx = /`([a-z_][a-z0-9_]*)\s*(?:\([^`]*?\))?`/gi;
  let m;
  while ((m = rx.exec(md)) !== null) docSet.add(m[1]);
  console.log(`📘 ${docSet.size} دالة مستخرجة من التوثيق.`);
}

// ─── 4) قراءة DB ─────────────────────────────────────────────
let dbSet = null;
if (opts.checkDb) {
  const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
  const REF = process.env.SUPABASE_PROJECT_REF;
  if (!TOKEN || !REF) {
    console.warn('⚠️  SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF غير مضبوطة — تخطّي فحص DB.');
  } else {
    const schemasLiteral = opts.schemas.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');
    const namePatternLit = opts.namePattern.replace(/'/g, "''");
    const excludePatternLit = opts.excludePattern.replace(/'/g, "''");
    const query = `
      SELECT p.proname AS name
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN (${schemasLiteral})
        AND p.prosecdef = true
        AND p.proname ~ '${namePatternLit}'
        AND p.proname !~ '${excludePatternLit}';
    `;
    const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      console.error(`❌ فشل استعلام DB: ${res.status} ${await res.text()}`);
      process.exit(2);
    }
    const rows = await res.json();
    dbSet = new Set(rows.map((r) => r.name));
    console.log(`🗄️  ${dbSet.size} دالة SECURITY DEFINER في DB.`);
  }
}

// ─── 5) حساب الفروق ───────────────────────────────────────────
const diff = (a, b) => [...a].filter((x) => !b.has(x)).sort();

const report = {
  options: opts,
  counts: {
    script: scriptSet.size,
    doc: opts.checkDoc ? docSet.size : null,
    db: dbSet ? dbSet.size : null,
  },
  undocumentedInDb: [],
  scriptStale: [],
  docStale: [],
  scriptDocMismatch: { onlyInScript: [], onlyInDoc: [] },
};

if (dbSet) {
  const union = new Set([...scriptSet, ...(opts.checkDoc ? docSet : [])]);
  report.undocumentedInDb = diff(dbSet, union);
  report.scriptStale = diff(scriptSet, dbSet);
  if (opts.checkDoc) report.docStale = diff(docSet, dbSet);
}

if (opts.checkDoc) {
  report.scriptDocMismatch.onlyInScript = diff(scriptSet, docSet);
  report.scriptDocMismatch.onlyInDoc = diff(docSet, scriptSet);
}

// ─── 6) التقرير ──────────────────────────────────────────────
function printSection(title, items) {
  if (!items.length) return false;
  console.error(`\n❌ ${title} (${items.length}):`);
  for (const x of items) console.error(`   - ${x}`);
  return true;
}

let hasFailure = false;
hasFailure = printSection('دوال DB غير موثّقة (مفقودة من Allowlist)', report.undocumentedInDb) || hasFailure;
hasFailure = printSection('إدخالات سكربت متقادمة (غير موجودة في DB)', report.scriptStale) || hasFailure;
hasFailure = printSection('إدخالات توثيق متقادمة (غير موجودة في DB)', report.docStale) || hasFailure;
hasFailure = printSection('في السكربت فقط (غير موجود في التوثيق)', report.scriptDocMismatch.onlyInScript) || hasFailure;
hasFailure = printSection('في التوثيق فقط (غير موجود في السكربت)', report.scriptDocMismatch.onlyInDoc) || hasFailure;

if (opts.reportJson) {
  const out = resolve(ROOT, opts.reportJson);
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\n📄 تقرير JSON محفوظ في: ${out}`);
}

if (hasFailure) {
  console.error('\n💡 المعالجة:');
  console.error('   - أضف الدوال المفقودة إلى docs/security/security-definer-allowlist.md و ALLOWLIST_0029/_ANON.');
  console.error('   - احذف الإدخالات المتقادمة بعد التحقق من DB.');
  if (opts.strict) process.exit(1);
  console.warn('⚠️  strict=false — تجاوز الفشل.');
  process.exit(0);
}

console.log('\n✅ التوثيق والسكربت وDB متطابقة.');
