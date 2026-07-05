#!/usr/bin/env node
/**
 * audit-report-guard — يمنع حفظ تقارير مكررة/قديمة في `audit/`.
 *
 * الفحوصات:
 *  1) أنماط ممنوعة: R\d+-EXECUTED, SIDEBAR-P\d+-EXECUTED, CHANGELOG-EXECUTION,
 *     -EXECUTED(-v\d)?, R-(NOW|RESCAN)-EXECUTED — هذه تقارير جولات منتهية،
 *     محتواها يُدمج في التقرير الجامع بدل تخزينه كملف مستقل.
 *  2) تكرار محتوى: أي ملفين .md لهما نفس SHA256 → منع.
 *  3) تقارير مؤرَّخة مكررة: أكثر من ملف بنفس prefix + تاريخ مختلف →
 *     الاحتفاظ بالأحدث فقط (تحذير).
 *  4) عند الكتابة عبر `writeIfChanged()`: لا يُحدَّث الملف إن كان
 *     الـ hash مطابقاً للنسخة الحالية.
 *
 * الاستخدام:
 *   node scripts/audit-report-guard.mjs           # فحص كامل (يفشل عند الانتهاك)
 *   node scripts/audit-report-guard.mjs --staged  # فحص staged files فقط (لـ pre-commit)
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename, extname } from 'node:path';
import { execSync } from 'node:child_process';

const AUDIT_DIR = 'audit';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

const FORBIDDEN_PATTERNS = [
  { re: /R\d+-EXECUTED(-v\d+)?\.md$/i, label: 'تقرير جولة تنفيذ (R\\d+-EXECUTED)' },
  { re: /R-(NOW|RESCAN(-\d+)?)-EXECUTED\.md$/i, label: 'تقرير R-NOW/R-RESCAN المنتهي' },
  { re: /SIDEBAR-P\d+-EXECUTED/i, label: 'تقرير SIDEBAR-P\\d+ منتهٍ' },
  { re: /CHANGELOG-EXECUTION\.md$/i, label: 'CHANGELOG-EXECUTION (مندمج في التقرير الجامع)' },
  { re: /-VERIFICATION\.md$/i, label: 'تقرير التحقق (يُدمج في FINAL-REPORT)' },
  { re: /D\d+-FIXED-.*\.md$/i, label: 'تقرير إصلاح فردي (D\\d+-FIXED)' },
];

/** استبعاد آمن للتقارير الحيّة (خرائط + مصفوفات + تقارير جامعة). */
const LIVING_REPORTS = new Set([
  'architecture-map.md',
  'structure-deep-review.md',
  'structure-inventory.md',
  'hooks-layout-report.md',
  'conventions-deep-report.md',
  'role-controls-review.md',
  'page-controls-audit.md',
  'ui-permissions-audit.md',
  'beneficiary-dashboard-final.md',
  'beneficiary-wiring-matrix.md',
  'report.html',
]);

/** يُطابق `forensic-YYYY-MM-DD` أو `pre-launch-YYYY-MM-DD` أو أي *-YYYY-MM-DD*. */
const DATED_RE = /^(.*?)-(\d{4}-\d{2}-\d{2})(.*)\.(md|csv|html)$/i;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * يكتب الملف فقط إذا اختلف الـ hash — يستخدم من سكربتات توليد التقارير.
 * @returns {'created'|'updated'|'unchanged'}
 */
export function writeIfChanged(path, content) {
  const newHash = sha256(Buffer.from(content));
  if (existsSync(path)) {
    const cur = readFileSync(path);
    if (sha256(cur) === newHash) return 'unchanged';
    writeFileSync(path, content);
    return 'updated';
  }
  writeFileSync(path, content);
  return 'created';
}

function checkForbiddenPatterns(files) {
  const hits = [];
  for (const f of files) {
    const base = basename(f);
    if (LIVING_REPORTS.has(base)) continue;
    for (const { re, label } of FORBIDDEN_PATTERNS) {
      if (re.test(base)) hits.push({ file: f, label });
    }
  }
  return hits;
}

function checkDuplicateContent(files) {
  const byHash = new Map();
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const h = sha256(readFileSync(f));
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(f);
  }
  return [...byHash.values()].filter((g) => g.length > 1);
}

function checkStaleDatedReports(files) {
  const groups = new Map();
  for (const f of files) {
    const base = basename(f);
    const m = base.match(DATED_RE);
    if (!m) continue;
    const [, prefix, date, suffix, ext] = m;
    const key = `${prefix}|${suffix}|${ext}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ file: f, date });
  }
  const stale = [];
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    items.sort((a, b) => (a.date < b.date ? 1 : -1));
    stale.push({ latest: items[0], older: items.slice(1) });
  }
  return stale;
}

function stagedFiles() {
  try {
    const raw = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
    });
    return raw.split('\n').filter((f) => f.startsWith(`${AUDIT_DIR}/`) && existsSync(f));
  } catch {
    return [];
  }
}

function main() {
  const stagedOnly = process.argv.includes('--staged');

  let files;
  if (stagedOnly) {
    files = stagedFiles();
    if (files.length === 0) {
      console.log(`${GRN}✓ audit-guard: لا توجد ملفات audit/ في التغييرات المُجهَّزة${NC}`);
      return 0;
    }
    console.log(`${DIM}audit-guard: فحص ${files.length} ملف مُجهَّز${NC}`);
  } else {
    if (!existsSync(AUDIT_DIR)) {
      console.log(`${DIM}audit-guard: مجلد ${AUDIT_DIR}/ غير موجود — تخطّي${NC}`);
      return 0;
    }
    files = walk(AUDIT_DIR);
  }

  let failed = false;

  // 1) الأنماط الممنوعة
  const forbidden = checkForbiddenPatterns(files);
  if (forbidden.length > 0) {
    failed = true;
    console.log('');
    console.log(`${RED}✗ audit-guard: تقارير بأنماط ممنوعة (تُدمج في التقرير الجامع بدل حفظها):${NC}`);
    for (const { file, label } of forbidden) {
      console.log(`   • ${file}  ${DIM}(${label})${NC}`);
    }
  }

  // 2) تكرار محتوى
  const dupes = checkDuplicateContent(files);
  if (dupes.length > 0) {
    failed = true;
    console.log('');
    console.log(`${RED}✗ audit-guard: تقارير بمحتوى مطابق تماماً (SHA256):${NC}`);
    for (const group of dupes) {
      console.log(`   مجموعة مكررة (${group.length}):`);
      for (const f of group) console.log(`      • ${f}`);
    }
  }

  // 3) نسخ مؤرَّخة قديمة (تحذير فقط)
  if (!stagedOnly) {
    const stale = checkStaleDatedReports(files);
    if (stale.length > 0) {
      console.log('');
      console.log(`${YEL}⚠ audit-guard: تقارير مؤرَّخة سابقة يُقترح حذفها:${NC}`);
      for (const { latest, older } of stale) {
        console.log(`   احتفظ: ${latest.file}`);
        for (const o of older) console.log(`   احذف : ${o.file}  ${DIM}(${o.date})${NC}`);
      }
    }
  }

  if (failed) {
    console.log('');
    console.log(`${YEL}للإصلاح:${NC}`);
    console.log('   • احذف الملف واحدث التقرير الجامع (audit/forensic-YYYY-MM-DD.md) بدلاً منه.');
    console.log('   • استخدم writeIfChanged() من هذا السكربت لتجنّب التحديثات الصامتة.');
    console.log('');
    console.log(`${YEL}تجاوز طارئ:${NC} git commit --no-verify`);
    return 1;
  }

  console.log(`${GRN}✓ audit-guard: لا تكرار ولا تقارير بأنماط منتهية${NC}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
