#!/usr/bin/env node
/**
 * deletion-gate.mjs — بوابة التحقق قبل/بعد كل دفعة حذف.
 *
 * تشغّل بالترتيب:
 *   1. tsc --noEmit                 → يجب 0 أخطاء
 *   2. vitest run                   → يجب أن تمر كل الاختبارات
 *   3. node scripts/audit-all.mjs   → بوابة Audit خضراء
 *
 * أي فشل = exit 1 + إيقاف فوري.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const c = (s, code) => `\x1b[${code}m${s}\x1b[0m`;
const red = (s) => c(s, 31);
const green = (s) => c(s, 32);
const cyan = (s) => c(s, 36);
const dim = (s) => c(s, 2);

const STEPS = [
  ['typecheck', 'npx', ['tsc', '--noEmit']],
  ['vitest',    'npx', ['vitest', 'run']],
  ['audit',     'node', ['scripts/audit-all.mjs']],
];

console.log(cyan('\n━━━ Deletion Gate ━━━'));
let failed = null;

for (const [name, cmd, args] of STEPS) {
  process.stdout.write(`  • ${name.padEnd(12)} `);
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status !== 0) {
    failed = { name, stderr: r.stderr, stdout: r.stdout, dt };
    console.log(red(`فشل (${dt}s)`));
    break;
  }
  console.log(green(`ok (${dt}s)`));
}

if (failed) {
  console.log(red(`\n✗ بوابة الحذف فشلت في الخطوة: ${failed.name}`));
  console.log(dim('────── stdout (آخر 40 سطراً) ──────'));
  console.log((failed.stdout || '').split('\n').slice(-40).join('\n'));
  console.log(dim('────── stderr (آخر 20 سطراً) ──────'));
  console.log((failed.stderr || '').split('\n').slice(-20).join('\n'));
  process.exit(1);
}

console.log(green('\n✓ بوابة الحذف مفتوحة — يُسمح بالحذف.'));
