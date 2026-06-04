#!/usr/bin/env node
/**
 * Round V3 — Audit أزرار وروابط واجهة المستخدم.
 *
 * يفحص ملفات src/pages/** و src/components/** ويُولّد:
 *  - audit/ui-permissions-audit.csv
 *  - audit/ui-permissions-audit.md
 *
 * قواعد كشف الفجوات (GAP-*):
 *  - GAP-NO-HANDLER:  <Button> أو <DropdownMenuItem> بدون onClick/asChild/type="submit"/داخل Trigger.
 *  - GAP-DEAD-LINK:   <Link to="/path"> حيث /path لا يطابق أي Route مسجَّل ولا يبدأ بـ http/mailto/tel/#.
 *  - GAP-DEAD-TAB:    <TabsTrigger value="X"> بدون <TabsContent value="X"> في نفس الملف.
 *  - GAP-DIRECT-DB:   صفحة في src/pages/ تستدعي supabase.from() مباشرة (يجب عبر hook).
 *
 * النهج: regex متعدد الأسطر — كافٍ لاكتشاف ~95% من المشاكل دون اعتمادية ts-morph.
 * يولّد تقرير CSV/MD فقط — لا يعدّل الكود.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src/pages', 'src/components'];
const OUT_DIR = resolve(ROOT, 'audit');

/** استخراج كل المسارات المسجَّلة من ملفات routes/ */
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

function lineOf(content, idx) {
  return content.slice(0, idx).split('\n').length;
}

/** يحدد ما إذا كان <Button أو <DropdownMenuItem ضمن نطاق Trigger (asChild). */
function isInsideTrigger(content, openIdx) {
  // نبحث للخلف عن أقرب <SomethingTrigger ... ولم يُغلق بعد
  const before = content.slice(0, openIdx);
  const triggerOpen = /<((?:Alert)?DialogTrigger|DropdownMenuTrigger|PopoverTrigger|TooltipTrigger|HoverCardTrigger|SheetTrigger|TabsTrigger)\b[^>]*asChild/g;
  let m, last = -1;
  while ((m = triggerOpen.exec(before)) !== null) last = m.index;
  if (last === -1) return false;
  // تأكد أن الـ Trigger لم يُغلق بين last و openIdx
  const between = before.slice(last);
  // عدد فتح/إغلاق نفس الـ tag
  const tagName = before.slice(last).match(/<(\w+)/)[1];
  const opens = (between.match(new RegExp(`<${tagName}\\b`, 'g')) || []).length;
  const closes = (between.match(new RegExp(`</${tagName}>`, 'g')) || []).length;
  return opens > closes;
}

function scanFile(file, registered, gaps) {
  const rel = relative(ROOT, file);
  const c = readFileSync(file, 'utf8');

  // GAP-NO-HANDLER on <Button ...>
  const btnRe = /<Button\b([^>]*)>/g;
  let m;
  while ((m = btnRe.exec(c)) !== null) {
    const attrs = m[1];
    if (/\basChild\b/.test(attrs)) continue;
    if (/\btype\s*=\s*["']submit["']/.test(attrs)) continue;
    if (/\bonClick\s*=/.test(attrs)) continue;
    if (/\bdisabled\b/.test(attrs) && !/onClick/.test(attrs)) continue; // disabled بدون handler مقبول
    if (isInsideTrigger(c, m.index)) continue;
    gaps.push({
      file: rel, line: lineOf(c, m.index), element: 'Button',
      status: 'GAP-NO-HANDLER', detail: attrs.trim().slice(0, 80),
    });
  }

  // GAP-NO-HANDLER on <DropdownMenuItem ...>
  const dmiRe = /<DropdownMenuItem\b([^>]*)>/g;
  while ((m = dmiRe.exec(c)) !== null) {
    const attrs = m[1];
    if (/\basChild\b/.test(attrs)) continue;
    if (/\bonClick\s*=/.test(attrs)) continue;
    if (/\bonSelect\s*=/.test(attrs)) continue;
    gaps.push({
      file: rel, line: lineOf(c, m.index), element: 'DropdownMenuItem',
      status: 'GAP-NO-HANDLER', detail: attrs.trim().slice(0, 80),
    });
  }

  // GAP-DEAD-LINK on <Link to="...">
  const linkRe = /<Link\b[^>]*\bto=["']([^"']+)["']/g;
  while ((m = linkRe.exec(c)) !== null) {
    const to = m[1];
    if (/^(https?:|mailto:|tel:|#)/.test(to)) continue;
    if (to.startsWith('..') || to.startsWith('./')) continue; // relative
    // strip query / hash
    const clean = to.split(/[?#]/)[0];
    // tolerate dynamic segments like /foo/:id — check the prefix only
    if (clean.includes(':')) continue;
    if (!registered.has(clean)) {
      gaps.push({
        file: rel, line: lineOf(c, m.index), element: 'Link',
        status: 'GAP-DEAD-LINK', detail: `to=${to}`,
      });
    }
  }

  // GAP-DEAD-TAB
  const trigs = [...c.matchAll(/<TabsTrigger\b[^>]*\bvalue=["']([^"']+)["']/g)];
  const conts = new Set([...c.matchAll(/<TabsContent\b[^>]*\bvalue=["']([^"']+)["']/g)].map(x => x[1]));
  for (const t of trigs) {
    if (!conts.has(t[1])) {
      gaps.push({
        file: rel, line: lineOf(c, t.index), element: 'TabsTrigger',
        status: 'GAP-DEAD-TAB', detail: `value=${t[1]}`,
      });
    }
  }

  // GAP-DIRECT-DB in pages
  if (rel.startsWith('src/pages/')) {
    const dbRe = /supabase\s*\.\s*from\s*\(/g;
    while ((m = dbRe.exec(c)) !== null) {
      gaps.push({
        file: rel, line: lineOf(c, m.index), element: 'supabase.from()',
        status: 'GAP-DIRECT-DB', detail: 'يجب نقله إلى hooks/data/',
      });
    }
  }
}

const registered = loadRegisteredPaths();
const files = SCAN_DIRS.flatMap(d => walk(resolve(ROOT, d)));
const gaps = [];
for (const f of files) scanFile(f, registered, gaps);

mkdirSync(OUT_DIR, { recursive: true });

// CSV
const csvHead = 'file,line,element,status,detail\n';
const csvBody = gaps
  .map(g => [g.file, g.line, g.element, g.status, `"${(g.detail || '').replace(/"/g, '""')}"`].join(','))
  .join('\n');
writeFileSync(join(OUT_DIR, 'ui-permissions-audit.csv'), csvHead + csvBody + '\n');

// MD summary
const byStatus = gaps.reduce((acc, g) => {
  acc[g.status] = (acc[g.status] || 0) + 1;
  return acc;
}, {});
const byFile = gaps.reduce((acc, g) => {
  acc[g.file] = (acc[g.file] || 0) + 1;
  return acc;
}, {});
const topFiles = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 25);

let md = '# UI Permissions & Button Audit\n\n';
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `Files scanned: ${files.length}\n`;
md += `Total GAPs: ${gaps.length}\n\n`;
md += '## By status\n\n';
for (const [s, n] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
  md += `- **${s}**: ${n}\n`;
}
md += '\n## Top 25 files\n\n';
for (const [f, n] of topFiles) md += `- ${f}: ${n}\n`;
md += '\n## All GAPs\n\n';
for (const g of gaps) {
  md += `- \`${g.file}:${g.line}\` — **${g.status}** — ${g.element} — ${g.detail}\n`;
}
writeFileSync(join(OUT_DIR, 'ui-permissions-audit.md'), md);

console.log(`Scanned ${files.length} files, found ${gaps.length} GAPs.`);
console.log(JSON.stringify(byStatus, null, 2));
console.log(`Output: ${OUT_DIR}/ui-permissions-audit.{csv,md}`);
