#!/usr/bin/env node
/**
 * audit-all.mjs — يشغّل سلسلة فحوصات audit ويُولّد التقرير الموحّد.
 * يُرجع exit code != 0 عند وجود Critical / GAP.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const STEPS = [
  ['structure',          'scripts/audit-structure.mjs'],
  ['conventions-deep',   'scripts/audit-conventions-deep.mjs'],
  ['hooks-layout',       'scripts/audit-hooks-layout.mjs'],
  ['ui-permissions',     'scripts/audit-ui-permissions.mjs'],
  ['page-controls',      'scripts/audit-page-controls.mjs'],
  ['build-report',       'scripts/build-audit-report.mjs'],
];

const c = (s, code) => `\x1b[${code}m${s}\x1b[0m`;
const red = (s) => c(s, 31);
const green = (s) => c(s, 32);
const yellow = (s) => c(s, 33);
const cyan = (s) => c(s, 36);

let hadStepFailure = false;
console.log(cyan('▶ تشغيل سلسلة Audit الكاملة'));

for (const [name, file] of STEPS) {
  process.stdout.write(`  • ${name.padEnd(20)} `);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [file], { cwd: ROOT, encoding: 'utf8' });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status !== 0) {
    hadStepFailure = true;
    console.log(red(`فشل (${dt}s)`));
    if (r.stderr) console.error(r.stderr.split('\n').slice(0, 20).join('\n'));
  } else {
    console.log(green(`ok (${dt}s)`));
  }
}

// ─── تجميع نتائج الانتهاكات ────────────────────────────────────────────────
const summary = { critical: 0, gap: 0, info: 0, details: [] };

const csvPath = resolve(ROOT, 'audit/conventions-deep-violations.csv');
if (existsSync(csvPath)) {
  const lines = readFileSync(csvPath, 'utf8').trim().split('\n').slice(1);
  for (const line of lines) {
    const sev = (line.split(',')[0] || '').toLowerCase();
    if (sev.includes('critical')) summary.critical++;
    else if (sev.includes('info')) summary.info++;
  }
}

const checkMd = (file, marker) => {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) return 0;
  const txt = readFileSync(p, 'utf8');
  const re = new RegExp(marker, 'gi');
  return (txt.match(re) || []).length;
};

// page-controls: استخرج العدد من السطر "| GAP-NO-HANDLER | N |"
{
  const p = resolve(ROOT, 'audit/page-controls-audit.md');
  if (existsSync(p)) {
    const m = readFileSync(p, 'utf8').match(/\|\s*GAP-NO-HANDLER\s*\|\s*(\d+)\s*\|/);
    if (m) summary.gap += parseInt(m[1], 10);
  }
}
// ui-permissions: صفوف فعلية تحتوي على GAP في عمود الحالة
summary.gap += checkMd('audit/ui-permissions-audit.md', '\\|\\s*GAP\\s*\\|\\s*[^\\d]');

// ─── طباعة الملخص ─────────────────────────────────────────────────────────
console.log('\n' + cyan('━━━ ملخص Audit ━━━'));
const fmt = (n, color) => n === 0 ? green(`${n}`) : color(`${n}`);
console.log(`  Critical : ${fmt(summary.critical, red)}`);
console.log(`  GAP      : ${fmt(summary.gap, red)}`);
console.log(`  Info     : ${fmt(summary.info, yellow)}`);
console.log(`  Report   : ${cyan('audit/report.html')}`);

const blocking = summary.critical + summary.gap;
if (hadStepFailure) {
  console.log(red('\n✗ فشل أحد سكربتات Audit — راجع الإخراج أعلاه.'));
  process.exit(2);
}
if (blocking > 0) {
  console.log(red(`\n✗ بوابة Audit مُغلقة — ${blocking} انتهاك حرج. يُمنع الـ push.`));
  process.exit(1);
}
console.log(green('\n✓ بوابة Audit مفتوحة — لا انتهاكات حرجة.'));
