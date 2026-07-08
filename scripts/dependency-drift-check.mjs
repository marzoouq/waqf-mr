#!/usr/bin/env node
/**
 * dependency-drift-check.mjs
 *
 * يفحص تطابق version بين package.json و package-lock.json.
 * exit 1 عند أي انحراف. يُستدعى من:
 *   - .husky/pre-push (قبل بوابة audit).
 *   - .github/workflows/security-audit.yml (أسبوعياً).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));

const pkgVer = pkg.version;
const lockRootVer = lock.version;
const lockPkgVer = lock.packages?.['']?.version;

const problems = [];
if (lockRootVer !== pkgVer) {
  problems.push(`package-lock.json (root).version = ${lockRootVer} ≠ package.json = ${pkgVer}`);
}
if (lockPkgVer !== pkgVer) {
  problems.push(`package-lock.json .packages[""].version = ${lockPkgVer} ≠ package.json = ${pkgVer}`);
}

if (problems.length) {
  console.error('❌ Dependency drift detected:');
  for (const p of problems) console.error(`   • ${p}`);
  console.error('\n   للإصلاح: npm install --package-lock-only');
  process.exit(1);
}

console.log(`✅ Version sync OK (${pkgVer})`);
