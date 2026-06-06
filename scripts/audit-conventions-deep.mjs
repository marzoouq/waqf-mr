#!/usr/bin/env node
// Read-only deep convention compliance check against memory rules.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const violations = []; // {severity, rule, file, line, msg}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) yield p;
  }
}

function add(sev, rule, file, line, msg) {
  violations.push({ sev, rule, file, line, msg });
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

const ALLOWED_HEX_DIRS = ['/pdf/', '/zatca/', '/chart/', '/fonts/', '/image/', '/canvas/'];
const ALLOWED_HEX_NAMES = /(Pdf|PDF|Chart|Canvas|Svg|SVG|Color|Theme|tailwind)/;

for (const abs of walk(ROOT)) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  const src = fs.readFileSync(abs, 'utf8');
  const isTest = /\.test\.(ts|tsx)$/.test(rel) || rel.startsWith('test/') || rel.startsWith('__mocks__');
  if (isTest) continue; // tests are exempt from runtime rules



  // Core Modularization v7: pages must not import supabase or hooks/data directly
  if (rel.startsWith('pages/')) {
    let m;
    const reSupa = /from\s+['"]@\/integrations\/supabase\/client['"]/g;
    while ((m = reSupa.exec(src))) add('Critical', 'CoreModV7', rel, lineOf(src, m.index), 'page imports supabase client directly');
    const reData = /^import\s+(?!type\b)[^;]*from\s+['"]@\/hooks\/data\//gm;
    while ((m = reData.exec(src))) add('Critical', 'CoreModV7', rel, lineOf(src, m.index), 'page imports from hooks/data/* directly (non-type)');
  }

  // Hooks Layering
  if (rel.startsWith('hooks/data/')) {
    let m;
    const reToast = /from\s+['"]sonner['"]/g;
    while ((m = reToast.exec(src))) add('Critical', 'NoToastInDataHooks', rel, lineOf(src, m.index), 'hooks/data imports sonner');
  }
  if (rel.startsWith('hooks/domain/')) {
    let m;
    const reSupa = /from\s+['"]@\/integrations\/supabase\/client['"]/g;
    while ((m = reSupa.exec(src))) add('Critical', 'HooksLayering', rel, lineOf(src, m.index), 'hooks/domain imports supabase directly');
  }

  // lib vs utils
  if (rel.startsWith('utils/')) {
    let m;
    const reToast = /from\s+['"]sonner['"]/g;
    while ((m = reToast.exec(src))) add('Critical', 'LibVsUtils', rel, lineOf(src, m.index), 'utils imports sonner');
    const reSupa = /from\s+['"]@\/integrations\/supabase/g;
    while ((m = reSupa.exec(src))) add('Critical', 'LibVsUtils', rel, lineOf(src, m.index), 'utils imports supabase');
    const reData = /from\s+['"]@\/hooks\/data\//g;
    while ((m = reData.exec(src))) add('Critical', 'LibVsUtils', rel, lineOf(src, m.index), 'utils imports hooks/data (wrong direction)');
  }

  // Barrel Rule: index.ts must not import from another index.ts (barrel→barrel)
  if (path.basename(rel) === 'index.ts') {
    const reBarrel = /from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = reBarrel.exec(src))) {
      const spec = m[1];
      if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
      // detect import of another barrel: ends with /index or directory import (no .ts/.tsx)
      if (/\/index$/.test(spec)) add('Warning', 'BarrelRule', rel, lineOf(src, m.index), `imports barrel: ${spec}`);
    }
  }

  // Wave 9 — barrel-only لـ components/common: ممنوع المسارات الفرعية خارج المجلد نفسه.
  if (!rel.startsWith('components/common/')) {
    const reCommonSub = /from\s+['"]@\/components\/common\/[^'"]+['"]/g;
    let m;
    while ((m = reCommonSub.exec(src))) {
      add('Critical', 'CommonBarrelOnly', rel, lineOf(src, m.index), 'import مسار فرعي من components/common — استخدم البارّل @/components/common فقط');
    }
  }

  // No console outside logger
  if (!rel.includes('lib/logger')) {
    let m;
    const reC = /\bconsole\.(log|warn|error|info|debug)\b/g;
    while ((m = reC.exec(src))) {
      // skip in comments/strings (simple heuristic skip)
      const ln = lineOf(src, m.index);
      add('Warning', 'NoConsole', rel, ln, `console.${m[1]}`);
    }
  }

  // Hex colors in .tsx
  if (rel.endsWith('.tsx') && !ALLOWED_HEX_DIRS.some(d => rel.includes(d)) && !ALLOWED_HEX_NAMES.test(rel)) {
    let m;
    const reHex = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
    while ((m = reHex.exec(src))) {
      // skip URLs like #section or hash routes
      const ctx = src.slice(Math.max(0, m.index - 10), m.index);
      if (/href=|to=|#\//.test(ctx)) continue;
      add('Info', 'HexColors', rel, lineOf(src, m.index), `hex color ${m[0]}`);
    }
  }

  // Container vs Presentational sizing
  // عدّ الأسطر الحقيقية (نتجاهل سطر EOF النهائي إذا كان الملف ينتهي بـ \n)
  const loc = src.split('\n').length - (src.endsWith('\n') ? 1 : 0);
  if (rel.startsWith('components/') && rel.endsWith('.tsx')) {
    if (loc > 300) add('Critical', 'ComponentSize', rel, loc, `component ${loc} lines > 300 (hard cap)`);
    else if (loc > 250) add('Warning', 'ComponentSize', rel, loc, `component ${loc} lines > 250`);
    else if (loc > 200) add('Info', 'ComponentSize', rel, loc, `component ${loc} lines > 200`);
  }
  if (rel.startsWith('hooks/') && rel.endsWith('.ts')) {
    if (loc > 300) add('Critical', 'HookSize', rel, loc, `hook ${loc} lines > 300 (hard cap)`);
    else if (loc > 250) add('Warning', 'HookSize', rel, loc, `hook ${loc} lines > 250`);
    else if (loc > 200) add('Info', 'HookSize', rel, loc, `hook ${loc} lines > 200`);
  }

}

// Write outputs
const csv = ['severity,rule,file,line,message'];
for (const v of violations) csv.push(`${v.sev},${v.rule},${v.file},${v.line},"${v.msg.replace(/"/g, '""')}"`);
fs.writeFileSync('audit/conventions-deep-violations.csv', csv.join('\n'));

const byRule = {};
const bySev = { Critical: 0, Warning: 0, Info: 0 };
for (const v of violations) {
  byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  bySev[v.sev]++;
}

const md = ['# Conventions Deep Report', '', `Total violations: **${violations.length}** (Critical: ${bySev.Critical}, Warning: ${bySev.Warning}, Info: ${bySev.Info})`, ''];
md.push('## By rule', '', '| Rule | Count |', '|---|---:|');
for (const [r, c] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) md.push(`| ${r} | ${c} |`);
md.push('', '## Critical violations', '');
const crit = violations.filter(v => v.sev === 'Critical');
if (!crit.length) md.push('_None._');
else { md.push('| File:Line | Rule | Message |', '|---|---|---|'); for (const v of crit) md.push(`| ${v.file}:${v.line} | ${v.rule} | ${v.msg} |`); }
md.push('', '## Warnings (top 30)', '');
const warns = violations.filter(v => v.sev === 'Warning').slice(0, 30);
if (!warns.length) md.push('_None._');
else { md.push('| File:Line | Rule | Message |', '|---|---|---|'); for (const v of warns) md.push(`| ${v.file}:${v.line} | ${v.rule} | ${v.msg} |`); }

fs.writeFileSync('audit/conventions-deep-report.md', md.join('\n'));
console.log(`Conventions deep: ${violations.length} (Critical: ${bySev.Critical}, Warning: ${bySev.Warning}, Info: ${bySev.Info}).`);
process.exit(bySev.Critical > 0 ? 1 : 0);
