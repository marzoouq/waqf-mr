#!/usr/bin/env node
// Read-only structural inventory of src/. Writes audit/structure-inventory.csv.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const OUT = path.resolve('audit/structure-inventory.csv');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) yield p;
  }
}

function classify(rel) {
  if (rel.startsWith('pages/')) return 'page';
  if (rel.startsWith('routes/')) return 'route';
  if (rel.startsWith('hooks/data/')) return 'hook-data';
  if (rel.startsWith('hooks/domain/')) return 'hook-domain';
  if (rel.startsWith('hooks/page/')) return 'hook-page';
  if (rel.startsWith('hooks/application/')) return 'hook-application';
  if (rel.startsWith('hooks/auth/')) return 'hook-auth';
  if (rel.startsWith('hooks/ui/')) return 'hook-ui';
  if (rel.startsWith('hooks/')) return 'hook-other';
  if (rel.startsWith('components/')) return 'component';
  if (rel.startsWith('lib/')) return 'lib';
  if (rel.startsWith('utils/')) return 'util';
  if (rel.startsWith('types/')) return 'type';
  if (rel.startsWith('test/') || rel.includes('.test.')) return 'test';
  if (rel.startsWith('integrations/')) return 'integration';
  if (rel.startsWith('contexts/')) return 'context';
  if (rel.startsWith('constants/')) return 'constant';
  if (rel.startsWith('app/')) return 'app';
  return 'other';
}

const rows = [['path', 'layer', 'loc', 'imports', 'exports', 'is_barrel', 'has_supabase', 'has_toast', 'has_console', 'has_default_export']];
const stats = {};
const bigFiles = [];

for (const abs of walk(ROOT)) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  const src = fs.readFileSync(abs, 'utf8');
  const loc = src.split('\n').length;
  const imports = (src.match(/^import\s/gm) || []).length;
  const exports = (src.match(/^export\s/gm) || []).length;
  const reexportLines = (src.match(/^export\s+(\*|\{).*from\s+['"]/gm) || []).length;
  const isBarrel = path.basename(rel) === 'index.ts' && reexportLines > 0 && reexportLines === exports;
  const hasSupabase = /from\s+['"]@\/integrations\/supabase\/client['"]/.test(src);
  const hasToast = /from\s+['"]sonner['"]/.test(src);
  const hasConsole = /\bconsole\.(log|warn|error|info|debug)\b/.test(src);
  const hasDefault = /^export\s+default\b/m.test(src);
  const layer = classify(rel);
  rows.push([rel, layer, loc, imports, exports, isBarrel, hasSupabase, hasToast, hasConsole, hasDefault]);
  stats[layer] = stats[layer] || { count: 0, loc: 0 };
  stats[layer].count++;
  stats[layer].loc += loc;
  if (loc > 200) bigFiles.push({ rel, layer, loc });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, rows.map(r => r.join(',')).join('\n'));

bigFiles.sort((a, b) => b.loc - a.loc);
const summary = ['# Structure Inventory Summary', '', '## Files per layer', '', '| Layer | Count | Total LOC | Avg LOC |', '|---|---:|---:|---:|'];
for (const [layer, s] of Object.entries(stats).sort((a, b) => b[1].count - a[1].count)) {
  summary.push(`| ${layer} | ${s.count} | ${s.loc} | ${Math.round(s.loc / s.count)} |`);
}
summary.push('', `## Files > 200 LOC (${bigFiles.length})`, '', '| File | Layer | LOC |', '|---|---|---:|');
for (const f of bigFiles.slice(0, 30)) summary.push(`| ${f.rel} | ${f.layer} | ${f.loc} |`);
if (bigFiles.length > 30) summary.push(`| _… +${bigFiles.length - 30} more_ | | |`);

fs.writeFileSync(path.resolve('audit/structure-inventory.md'), summary.join('\n'));
console.log(`Inventory: ${rows.length - 1} files, ${bigFiles.length} > 200 LOC. Layers: ${Object.keys(stats).length}.`);
