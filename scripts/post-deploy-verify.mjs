#!/usr/bin/env node
/**
 * فحص ما بعد النشر — يتحقق أن المسارات العامة في الإنتاج تستجيب 200
 * وأن ملف الـ manifest و robots و sitemap متاحة.
 *
 * الاستخدام:
 *   node scripts/post-deploy-verify.mjs
 *   BASE_URL=https://waqf-wise.net node scripts/post-deploy-verify.mjs
 */
const BASE = (process.env.BASE_URL || 'https://waqf-wise.net').replace(/\/$/, '');

/** المسارات العامة (SPA fallback يجعلها كلها 200) */
const PATHS = [
  '/',
  '/auth',
  '/privacy-policy',
  '/terms-of-use',
  '/install',
  '/unauthorized',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
];

const failures = [];

console.log(`\n=== فحص ما بعد النشر: ${BASE} ===`);

for (const path of PATHS) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const ok = res.status === 200;
    console.log(`${ok ? '✅' : '❌'} ${res.status} ${path}`);
    if (!ok) failures.push(`${path} → ${res.status}`);
  } catch (e) {
    console.log(`❌ ERR ${path}`);
    failures.push(`${path} → ${String(e)}`);
  }
}

if (failures.length > 0) {
  console.error('\n❌ فشل الفحص بعد النشر:');
  for (const f of failures) console.error(`   - ${f}`);
  console.error('\nنفّذ خطة الرجوع: docs/ops/rollback-runbook.md\n');
  process.exit(1);
}

console.log('\n✅ كل المسارات العامة تستجيب بنجاح.\n');
