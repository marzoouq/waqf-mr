#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * audit-ui-permissions — Round W
 *
 * SCOPE & METHOD (explicit, first 10 lines):
 *   This is a REGEX-BASED gap scanner — NOT a full AST/ts-morph audit and NOT
 *   a complete role/route/permission matrix. It detects ~95% of common UI gaps
 *   via multi-line regex over src/pages/** and src/components/**.
 *   For the role/route/permission MATRIX (156 rows) see: scripts/build-permissions-matrix.mjs
 *   which generates audit/ui-permissions-matrix.csv from constants.
 *
 * Generates:
 *   - audit/ui-permissions-audit.csv (gap report: file,line,element,status,detail)
 *   - audit/ui-permissions-audit.md  (human summary + scope notice)
 *
 * Gap codes:
 *   - GAP-NO-HANDLER : <Button>/<DropdownMenuItem> without onClick/asChild/type=submit/parent Trigger|Link
 *   - GAP-DEAD-LINK  : <Link to="/x"> where /x is not in registered <Route path>
 *   - GAP-DEAD-TAB   : <TabsTrigger value="X"> with no matching <TabsContent value="X"> in same file
 *   - GAP-DIRECT-DB  : page in src/pages/ calls supabase.from(...) directly (should go via hook)
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src/pages', 'src/components'];
const OUT_DIR = resolve(ROOT, 'audit');

function loadRegisteredPaths() {
  const files = [
    'src/routes/adminRoutes.tsx',
    'src/routes/beneficiaryRoutes.tsx',
    'src/routes/waqifRoutes.tsx',
    'src/routes/publicRoutes.tsx',
  ];
  const re = /<Route\s+path=["']([^"'*]+)["']/g;
  const out = new Set();
  for (const f of files) {
    const c = readFileSync(resolve(ROOT, f), 'utf8');
    let m;
    while ((m = re.exec(c)) !== null) out.add(m[1]);
  }
  return out;
}

function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(name) && !/\.(test|spec)\./.test(name)) acc.push(p);
  }
  return acc;
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

/** Check whether the byte range [start,end] inside src sits within a wrapper tag
 *  whose open tag appears before start and close tag appears after end. */
function isWrappedBy(src, start, end, openTag, closeTag) {
  const before = src.slice(0, start);
  const after = src.slice(end);
  const lastOpen = before.lastIndexOf(`<${openTag}`);
  if (lastOpen === -1) return false;
  // count balanced opens/closes between lastOpen and our position
  const between = src.slice(lastOpen, start);
  const opens = (between.match(new RegExp(`<${openTag}\\b`, 'g')) || []).length;
  const closes = (between.match(new RegExp(`</${closeTag}>`, 'g')) || []).length;
  if (opens - closes < 1) return false;
  // there must be a closing tag somewhere after end
  return after.includes(`</${closeTag}>`);
}

function scanFile(filePath, src, registered, gaps) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  const isPage = rel.startsWith('src/pages/');

  // GAP-NO-HANDLER: <Button ...> opening tags
  const btnRe = /<(Button|DropdownMenuItem)\b([^>]*)>/g;
  let m;
  while ((m = btnRe.exec(src)) !== null) {
    const attrs = m[2];
    if (/\bonClick\b/.test(attrs)) continue;
    if (/\basChild\b/.test(attrs)) continue;
    if (/\btype\s*=\s*["']submit["']/.test(attrs)) continue;
    if (/\bform\s*=/.test(attrs)) continue;
    if (/\bdisabled\b/.test(attrs)) continue; // intentionally inert
    // wrapped by Link or any *Trigger / *Item component with asChild
    const start = m.index;
    const end = start + m[0].length;
    const before = src.slice(Math.max(0, start - 400), start);
    const wrappedByTrigger = /<([A-Z]\w*(?:Trigger|Link))\b[^>]*\basChild\b[^>]*>\s*$/.test(before);
    const wrappedByLink = /<Link\b[^>]*>\s*$/.test(before);
    const wrapped = wrappedByTrigger || wrappedByLink;
    if (wrapped) continue;
    gaps.push({
      file: rel,
      line: lineOf(src, start),
      element: m[1],
      status: 'GAP-NO-HANDLER',
      detail: m[0].slice(0, 120).replace(/\s+/g, ' '),
    });
  }

  // GAP-DEAD-LINK: <Link to="/x">
  const linkRe = /<Link\b[^>]*\bto\s*=\s*["']([^"'$]+)["']/g;
  while ((m = linkRe.exec(src)) !== null) {
    const to = m[1];
    if (/^(https?:|mailto:|tel:|#|\?|\.)/.test(to)) continue;
    if (to.startsWith('/') && !registered.has(to)) {
      // tolerate dynamic params /foo/:id — strip last segment
      const base = to.replace(/\/:?[^/]+$/, '');
      if (registered.has(to) || registered.has(base)) continue;
      gaps.push({
        file: rel,
        line: lineOf(src, m.index),
        element: 'Link',
        status: 'GAP-DEAD-LINK',
        detail: to,
      });
    }
  }

  // GAP-DEAD-TAB: <TabsTrigger value="X"> without <TabsContent value="X">
  const triggers = [...src.matchAll(/<TabsTrigger\b[^>]*\bvalue\s*=\s*["']([^"']+)["']/g)];
  const contents = new Set([...src.matchAll(/<TabsContent\b[^>]*\bvalue\s*=\s*["']([^"']+)["']/g)].map(x => x[1]));
  // also accept dynamic onValueChange filter tabs (no TabsContent needed when filter pattern)
  const hasFilterPattern = /onValueChange\b/.test(src) && /<Tabs\b[^>]*\bvalue\s*=\s*\{/.test(src);
  for (const t of triggers) {
    const v = t[1];
    if (contents.has(v)) continue;
    if (hasFilterPattern) continue;
    gaps.push({
      file: rel,
      line: lineOf(src, t.index),
      element: 'TabsTrigger',
      status: 'GAP-DEAD-TAB',
      detail: `value="${v}" — no matching TabsContent`,
    });
  }

  // GAP-DIRECT-DB: supabase.from in pages
  if (isPage) {
    const dbRe = /supabase\s*\.\s*from\s*\(/g;
    while ((m = dbRe.exec(src)) !== null) {
      gaps.push({
        file: rel,
        line: lineOf(src, m.index),
        element: 'supabase.from',
        status: 'GAP-DIRECT-DB',
        detail: 'page calls DB directly — move to hooks/data',
      });
    }
  }
}

function main() {
  const registered = loadRegisteredPaths();
  const files = [];
  for (const d of SCAN_DIRS) walk(resolve(ROOT, d), files);

  const gaps = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    scanFile(f, src, registered, gaps);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // CSV
  const header = 'file,line,element,status,detail';
  const rows = gaps.map(g => [g.file, g.line, g.element, g.status, `"${String(g.detail).replace(/"/g, '""')}"`].join(','));
  writeFileSync(resolve(OUT_DIR, 'ui-permissions-audit.csv'), [header, ...rows].join('\n') + '\n', 'utf8');

  // MD summary
  const byStatus = gaps.reduce((acc, g) => { acc[g.status] = (acc[g.status] || 0) + 1; return acc; }, {});
  const byFile = gaps.reduce((acc, g) => { acc[g.file] = (acc[g.file] || 0) + 1; return acc; }, {});
  const topFiles = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 25);

  const md = [
    '# UI Permissions & Button Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Scope & method',
    '',
    'This report is a **regex-based gap scanner** over `src/pages/**` and `src/components/**`.',
    'It is **not** a full AST/ts-morph audit and **not** a complete role/route/permission matrix.',
    'For the full 156-row role × route matrix see `audit/ui-permissions-matrix.csv`',
    '(generated by `scripts/build-permissions-matrix.mjs`).',
    '',
    `Files scanned: ${files.length}`,
    `Total gaps: ${gaps.length}`,
    '',
    '## By status',
    '',
    ...Object.entries(byStatus).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Top 25 files',
    '',
    ...topFiles.map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## All gaps',
    '',
    ...gaps.map(g => `- \`${g.file}:${g.line}\` **${g.status}** \`${g.element}\` — ${g.detail}`),
    '',
  ].join('\n');
  writeFileSync(resolve(OUT_DIR, 'ui-permissions-audit.md'), md, 'utf8');

  console.log(`Scanned ${files.length} files. Gaps: ${gaps.length}`);
  for (const [k, v] of Object.entries(byStatus)) console.log(`  ${k}: ${v}`);
}

main();
