#!/usr/bin/env node
/**
 * Security gates — يفشل البناء عند اكتشاف أنماط أمنية محظورة في Edge Functions.
 *
 * يفحص:
 *  1. console.log/error/warn يحوي PII (email/password/national_id/userId/token) في supabase/functions/**.
 *  2. استخدام getSession() داخل supabase/functions/** (ممنوع — استخدم getUser()/getClaims()).
 *  3. SUPABASE_SERVICE_ROLE_KEY خارج allowlist الموثّقة.
 *
 * الاستخدام:
 *   node scripts/security-gates.mjs
 *
 * يعود exit code 1 عند أي مخالفة.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions');

// Allowlist موثّقة لاستخدام SERVICE_ROLE_KEY (عمليات admin شرعية تحتاجه)
const SERVICE_ROLE_ALLOWLIST = new Set([
  'admin-manage-users',
  'admin-update-password',
  'auth-email-hook',
  'auth-verify',
  'biometric-register',
  'biometric-authenticate',
  'biometric-enroll',
  'check-contract-expiry',
  'dashboard-summary',
  'distribute-shares',
  'execute-distribution',
  'guard-signup',
  'health-check',
  'lookup-national-id',
  'process-email-queue',
  'fiscal-year-close',
  'fiscal-year-reopen',
  'webauthn',
  'zatca-onboard',
  'zatca-report',
  'zatca-renew',
  '_shared',
]);

// أنماط PII داخل console.* (نلتقط فقط حقول الكائنات لتجنّب false positives على المتغيرات)
const PII_KEY_PATTERN = /\bconsole\.(log|warn|error|info)\b[^;\n]{0,400}\b(email|password|national_id|nationalId|userEmail|userId|token|jwt|secret|api[_-]?key)\s*:/i;
const GET_SESSION_PATTERN = /\.auth\.getSession\s*\(/;
const SERVICE_ROLE_PATTERN = /SUPABASE_SERVICE_ROLE_KEY/;

const violations = [];

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules') continue;
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx|mjs|js)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx|mjs|js)$/.test(entry)) continue;

    const rel = relative(ROOT, full);
    const content = readFileSync(full, 'utf8');
    const lines = content.split('\n');

    // اسم الـ function (المجلد الأول تحت functions/)
    const parts = relative(FUNCTIONS_DIR, full).split('/');
    const fnName = parts[0];

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      // 1. PII in console
      if (PII_KEY_PATTERN.test(line)) {
        // استثناء: السطر يستخدم maskEmail/maskPII/hash/redact
        if (!/mask(Email|Pii|PII)|redact|hash\(/.test(line)) {
          violations.push({ rel, lineNo, kind: 'PII log', line: line.trim().slice(0, 200) });
        }
      }
      // 2. getSession in edge function
      if (GET_SESSION_PATTERN.test(line)) {
        violations.push({ rel, lineNo, kind: 'getSession() in Edge Function (use getUser/getClaims)', line: line.trim().slice(0, 200) });
      }
      // 3. SERVICE_ROLE outside allowlist
      if (SERVICE_ROLE_PATTERN.test(line) && !SERVICE_ROLE_ALLOWLIST.has(fnName)) {
        violations.push({ rel, lineNo, kind: `SERVICE_ROLE_KEY used in non-allowlisted function "${fnName}"`, line: line.trim().slice(0, 200) });
      }
    });
  }
};

try {
  walk(FUNCTIONS_DIR);
} catch (err) {
  console.error('[security-gates] فشل المسح:', err.message);
  process.exit(2);
}

if (violations.length > 0) {
  console.error(`\n❌ [security-gates] ${violations.length} مخالفة أمنية:\n`);
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.lineNo}  [${v.kind}]`);
    console.error(`    ${v.line}\n`);
  }
  process.exit(1);
}

console.log('✅ [security-gates] لا مخالفات أمنية في Edge Functions.');
