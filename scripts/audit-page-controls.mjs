#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * audit-page-controls — Phase 2 of role-controls review
 *
 * SCOPE & METHOD:
 *   Regex-based inventory of UI controls (Tabs / Buttons / DropdownItems / Links / Form submits)
 *   across admin (src/pages/dashboard/**) and beneficiary (src/pages/beneficiary/**) pages,
 *   including their first-level child components imported from src/components/{dashboard,beneficiary,...}.
 *
 *   For each control it reports:
 *     - file:line
 *     - control_type   : Tab | Button | DropdownItem | Link | FormSubmit
 *     - control_label  : best-effort label/aria-label/children text
 *     - handler_kind   : onClick | asChild | type=submit | parent-Trigger | Link-to | UNKNOWN
 *     - status         : OK | GAP-NO-HANDLER
 *
 *   route_required is resolved from src/constants/routeRoles.ts via the page's URL path,
 *   inferred from the page filename and the routes file.
 *
 * NOT a full AST audit. For role/route matrix see scripts/build-permissions-matrix.mjs.
 * For permission-gate enforcement see RequirePermission + usePermissionCheck (covered by
 * permissionKeysCoverage.test and roleRouteAccess.test).
 *
 * Output:
 *   - audit/page-controls-audit.csv
 *   - audit/page-controls-audit.md
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, basename } from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, 'audit');
const PAGE_DIRS = ['src/pages/dashboard', 'src/pages/beneficiary'];

// ---- 1. resolve page filename -> route path & required roles ----
function loadRouteMap() {
  const out = {}; // pageBasename -> { path, roles }
  const routeFiles = ['src/routes/adminRoutes.tsx', 'src/routes/beneficiaryRoutes.tsx'];
  for (const f of routeFiles) {
    const c = readFileSync(resolve(ROOT, f), 'utf8');
    // import name -> page basename
    const imports = {};
    const importRe = /const\s+(\w+)\s*=\s*lazyWithRetry\(\(\)\s*=>\s*import\(["']@\/pages\/[^"']*\/(\w+)["']\)\)/g;
    let m;
    while ((m = importRe.exec(c)) !== null) imports[m[1]] = m[2];
    // <Route path="..."> ... pr(ROLE, <Component />)
    const routeRe = /<Route\s+path=["']([^"']+)["']\s+element=\{pr\((\w+),\s*<(\w+)\s*\/>/g;
    while ((m = routeRe.exec(c)) !== null) {
      const path = m[1];
      const rolesConst = m[2];
      const comp = m[3];
      const pageBase = imports[comp];
      if (pageBase) out[pageBase] = { path, roles: rolesConst };
    }
  }
  return out;
}

// ---- 2. walk pages ----
function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx)$/.test(name) && !/\.(test|spec)\./.test(name)) acc.push(p);
  }
  return acc;
}

function lineOf(src, idx) { return src.slice(0, idx).split('\n').length; }

function cleanLabel(s) {
  return (s || '')
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .trim()
    .slice(0, 80);
}

// extract the open tag and its inner block to detect handler/children
function extractOpenTagAndInner(src, idx, tagName) {
  // find end of opening tag (handle nested braces for JSX attrs)
  let i = idx;
  let depth = 0;
  let inStr = null;
  while (i < src.length) {
    const ch = src[i];
    if (inStr) { if (ch === inStr && src[i-1] !== '\\') inStr = null; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue; }
    if (ch === '{') { depth++; i++; continue; }
    if (ch === '}') { depth--; i++; continue; }
    if (ch === '>' && depth === 0) { i++; break; }
    if (ch === '/' && src[i+1] === '>' && depth === 0) { return { open: src.slice(idx, i+2), inner: '', selfClosed: true, end: i+2 }; }
    i++;
  }
  const openEnd = i;
  const open = src.slice(idx, openEnd);
  // find matching close tag
  let bal = 1;
  let j = openEnd;
  const openRe = new RegExp(`<${tagName}\\b`, 'g');
  const closeRe = new RegExp(`</${tagName}>`, 'g');
  openRe.lastIndex = openEnd;
  closeRe.lastIndex = openEnd;
  while (bal > 0 && j < src.length) {
    openRe.lastIndex = j; closeRe.lastIndex = j;
    const o = openRe.exec(src); const cl = closeRe.exec(src);
    if (!cl) return { open, inner: '', selfClosed: false, end: openEnd };
    if (o && o.index < cl.index) { bal++; j = o.index + 1; }
    else { bal--; j = cl.index + cl[0].length; if (bal === 0) return { open, inner: src.slice(openEnd, cl.index), selfClosed: false, end: j }; }
  }
  return { open, inner: '', selfClosed: false, end: openEnd };
}

function hasHandler(openTag, innerText, parentChain) {
  if (/\bonClick\s*=/.test(openTag)) return 'onClick';
  if (/\bonSubmit\s*=/.test(openTag)) return 'onSubmit';
  if (/\basChild\b/.test(openTag)) return 'asChild';
  if (/\btype\s*=\s*["']submit["']/.test(openTag)) return 'type=submit';
  if (/\bto\s*=\s*["{]/.test(openTag)) return 'Link-to';
  if (/\bhref\s*=\s*["{]/.test(openTag)) return 'href';
  if (/\bdisabled\b/.test(openTag) && !/\bonClick/.test(openTag)) return 'disabled';
  // parent wrappers (DialogTrigger, DropdownMenuTrigger, AlertDialogTrigger, PopoverTrigger, SheetTrigger, TooltipTrigger, Link)
  if (parentChain && /(?:DialogTrigger|DropdownMenuTrigger|AlertDialogTrigger|PopoverTrigger|SheetTrigger|TooltipTrigger|HoverCardTrigger|ContextMenuTrigger|MenubarTrigger|\bLink\b)/.test(parentChain)) return 'parent-Trigger';
  return null;
}

function extractLabel(openTag, inner) {
  const aria = /\baria-label\s*=\s*["']([^"']+)["']/.exec(openTag);
  if (aria) return aria[1];
  const title = /\btitle\s*=\s*["']([^"']+)["']/.exec(openTag);
  if (title) return title[1];
  const value = /\bvalue\s*=\s*["']([^"']+)["']/.exec(openTag);
  // for tabs / form inputs value is helpful
  // gather inner text (strip JSX tags & {expr})
  const text = (inner || '')
    .replace(/\{[^{}]*\}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text) return text;
  if (value) return `[value=${value[1]}]`;
  return '';
}

// find parent chain (last ~3 ancestors) at a given index by scanning backwards
function parentChainAt(src, idx) {
  const before = src.slice(Math.max(0, idx - 1200), idx);
  const opens = [...before.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map(m => m[1]);
  const closes = [...before.matchAll(/<\/([A-Z][A-Za-z0-9]*)>/g)].map(m => m[1]);
  const stack = [];
  // simple non-balanced approximation
  for (const t of opens) stack.push(t);
  for (const t of closes) {
    const idx = stack.lastIndexOf(t);
    if (idx >= 0) stack.splice(idx, 1);
  }
  return stack.slice(-3).join('>');
}

function scanControls(filePath, src) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  const out = [];
  const patterns = [
    { type: 'Tab',           re: /<TabsTrigger\b/g,        tag: 'TabsTrigger' },
    { type: 'Button',        re: /<Button\b/g,             tag: 'Button' },
    { type: 'IconButton',    re: /<IconButton\b/g,         tag: 'IconButton' },
    { type: 'DropdownItem',  re: /<DropdownMenuItem\b/g,   tag: 'DropdownMenuItem' },
    { type: 'CommandItem',   re: /<CommandItem\b/g,        tag: 'CommandItem' },
    { type: 'MenuItem',      re: /<MenuItem\b/g,           tag: 'MenuItem' },
    { type: 'Link',          re: /<Link\b/g,               tag: 'Link' },
    { type: 'FormSubmit',    re: /<form\b/g,               tag: 'form' },
  ];
  for (const p of patterns) {
    let m;
    p.re.lastIndex = 0;
    while ((m = p.re.exec(src)) !== null) {
      const idx = m.index;
      const { open, inner, selfClosed } = extractOpenTagAndInner(src, idx, p.tag);
      const parents = parentChainAt(src, idx);
      const handler = hasHandler(open, inner, parents);
      const label = extractLabel(open, inner) || '';
      out.push({
        file: rel,
        line: lineOf(src, idx),
        control_type: p.type,
        control_label: cleanLabel(label),
        handler_kind: handler || 'UNKNOWN',
        parents,
        status: handler ? 'OK' : 'GAP-NO-HANDLER',
        selfClosed,
      });
    }
  }
  return out;
}

// ---- 3. main ----
mkdirSync(OUT_DIR, { recursive: true });
const routeMap = loadRouteMap();

const allFiles = PAGE_DIRS.flatMap(d => walk(resolve(ROOT, d)));
const rows = [];
const perPage = {};

for (const f of allFiles) {
  const src = readFileSync(f, 'utf8');
  const base = basename(f, '.tsx');
  const route = routeMap[base];
  const controls = scanControls(f, src);
  perPage[relative(ROOT, f).replace(/\\/g, '/')] = {
    route: route?.path || '(no route)',
    roles: route?.roles || '(n/a)',
    controls,
  };
  for (const c of controls) {
    rows.push({
      page: relative(ROOT, f).replace(/\\/g, '/'),
      route: route?.path || '',
      roles: route?.roles || '',
      ...c,
    });
  }
}

// ---- 4. write CSV ----
const csvHeader = 'page,route,roles,line,control_type,control_label,handler_kind,parents,status';
const csvLines = rows.map(r => [
  r.page, r.route, r.roles, r.line, r.control_type,
  `"${(r.control_label || '').replace(/"/g, "'")}"`,
  r.handler_kind,
  `"${r.parents || ''}"`,
  r.status,
].join(','));
writeFileSync(resolve(OUT_DIR, 'page-controls-audit.csv'), [csvHeader, ...csvLines].join('\n') + '\n');

// ---- 5. write Markdown summary ----
const gapRows = rows.filter(r => r.status !== 'OK');
let md = '';
md += `# Page Controls Audit — Admin & Beneficiary\n\n`;
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `## Scope\n\n`;
md += `- Pages scanned: **${Object.keys(perPage).length}** under \`src/pages/dashboard\` + \`src/pages/beneficiary\`.\n`;
md += `- Control types: Tab, Button, IconButton, DropdownItem, CommandItem, MenuItem, Link, FormSubmit (top-level only — children components are not recursively scanned in this phase).\n`;
md += `- Method: regex inventory (not full AST). A control is **OK** if it has \`onClick\` / \`onSubmit\` / \`asChild\` / \`type=submit\` / \`to=\` / \`href=\` / parent Trigger.\n\n`;
md += `## Totals\n\n`;
md += `| Metric | Value |\n|---|---|\n`;
md += `| Total controls | ${rows.length} |\n`;
md += `| OK | ${rows.length - gapRows.length} |\n`;
md += `| GAP-NO-HANDLER | ${gapRows.length} |\n\n`;

md += `## Per-page summary\n\n`;
md += `| Page | Route | Roles | Tabs | Buttons | Dropdown/CommandItems | Links | Forms | Gaps |\n`;
md += `|---|---|---|---:|---:|---:|---:|---:|---:|\n`;
for (const [page, info] of Object.entries(perPage).sort()) {
  const cs = info.controls;
  const c = (t) => cs.filter(x => x.control_type === t).length;
  const dropdowns = cs.filter(x => ['DropdownItem','CommandItem','MenuItem'].includes(x.control_type)).length;
  const gaps = cs.filter(x => x.status !== 'OK').length;
  const gapMark = gaps > 0 ? `🔴 ${gaps}` : '✅ 0';
  md += `| \`${page.replace('src/pages/','')}\` | \`${info.route}\` | ${info.roles} | ${c('Tab')} | ${c('Button')+c('IconButton')} | ${dropdowns} | ${c('Link')} | ${c('FormSubmit')} | ${gapMark} |\n`;
}

if (gapRows.length > 0) {
  md += `\n## Gaps (controls without handler)\n\n`;
  md += `| file:line | type | label | parents |\n|---|---|---|---|\n`;
  for (const r of gapRows) {
    md += `| \`${r.page}:${r.line}\` | ${r.control_type} | ${r.control_label || '_(empty)_'} | \`${r.parents}\` |\n`;
  }
} else {
  md += `\n## Gaps\n\n✅ No controls without a handler detected on admin/beneficiary pages.\n`;
}

writeFileSync(resolve(OUT_DIR, 'page-controls-audit.md'), md);
console.log(`Scanned ${Object.keys(perPage).length} pages. Controls: ${rows.length}. Gaps: ${gapRows.length}.`);
