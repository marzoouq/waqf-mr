#!/usr/bin/env node
// Hooks subfolder layout & naming check.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/hooks');
const issues = [];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.test.ts') && !e.name.endsWith('.test.tsx')) yield p;
  }
}

function listDirs(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
}

// Auth subfolder layout
const authDirs = listDirs(path.join(ROOT, 'auth'));
const expectedAuth = ['session', 'role', 'biometric', 'flows'];
for (const d of expectedAuth) if (!authDirs.includes(d)) issues.push({ rule: 'HooksAuthLayout', sev: 'Warning', msg: `missing hooks/auth/${d}/` });

// Data subfolder layout
const dataDirs = listDirs(path.join(ROOT, 'data'));
for (const sub of ['financial', 'settings']) {
  const p = path.join(ROOT, 'data', sub);
  if (fs.existsSync(p)) {
    const subdirs = listDirs(p);
    if (subdirs.length === 0) issues.push({ rule: 'HooksDataLayout', sev: 'Info', msg: `hooks/data/${sub} not split into subfolders` });
  }
}

// Per-file checks
let total = 0;
for (const abs of walk(ROOT)) {
  total++;
  const rel = path.relative(path.resolve('src'), abs).replace(/\\/g, '/');
  const base = path.basename(abs, path.extname(abs));
  const src = fs.readFileSync(abs, 'utf8');

  // Hook naming (skip index, types, helpers)
  if (base !== 'index' && !/^(types|helpers|utils|constants)$/.test(base) && !base.startsWith('use')) {
    // Allow if no exported hook function
    if (/export\s+(function|const)\s+use[A-Z]/.test(src)) {
      // file contains a hook but name doesn't start with use
      issues.push({ rule: 'HookNaming', sev: 'Info', file: rel, msg: `file "${base}" exports a hook but filename doesn't start with "use"` });
    }
  }

  // No imports from pages/**
  let m;
  const rePages = /from\s+['"]@\/pages\//g;
  while ((m = rePages.exec(src))) {
    issues.push({ rule: 'HookDirection', sev: 'Critical', file: rel, msg: 'hook imports from @/pages (wrong direction)' });
  }

  // Direct import of hooks/auth/index (barrel)
  const reAuthBarrel = /from\s+['"]@\/hooks\/auth['"]/g;
  while ((m = reAuthBarrel.exec(src))) {
    issues.push({ rule: 'HooksAuthBarrel', sev: 'Warning', file: rel, msg: 'imports from @/hooks/auth barrel (use direct path)' });
  }
}

// Also scan whole src for auth barrel imports
function* walkAll(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkAll(p);
    else if (/\.(ts|tsx)$/.test(e.name)) yield p;
  }
}
let authBarrelHits = 0;
for (const abs of walkAll(path.resolve('src'))) {
  const src = fs.readFileSync(abs, 'utf8');
  if (/from\s+['"]@\/hooks\/auth['"]/.test(src)) {
    authBarrelHits++;
    const rel = path.relative(path.resolve('src'), abs).replace(/\\/g, '/');
    if (!rel.startsWith('hooks/')) issues.push({ rule: 'HooksAuthBarrel', sev: 'Warning', file: rel, msg: 'imports from @/hooks/auth barrel (use direct path)' });
  }
}

const md = ['# Hooks Layout Report', '', `Scanned ${total} hook files in src/hooks/. Issues: **${issues.length}**.`, ''];
md.push('## Auth subfolders', '', `Present: ${authDirs.join(', ') || '(none)'}`, '', '## Data subfolders', '');
md.push(`financial: ${listDirs(path.join(ROOT, 'data/financial')).join(', ') || '(flat)'}`);
md.push(`settings: ${listDirs(path.join(ROOT, 'data/settings')).join(', ') || '(flat)'}`);
md.push('', '## Issues', '');
if (!issues.length) md.push('_No issues._');
else { md.push('| Severity | Rule | File | Message |', '|---|---|---|---|'); for (const i of issues) md.push(`| ${i.sev} | ${i.rule} | ${i.file || '-'} | ${i.msg} |`); }

fs.writeFileSync('audit/hooks-layout-report.md', md.join('\n'));
console.log(`Hooks layout: ${total} files, ${issues.length} issues.`);
