#!/usr/bin/env node
// Build a self-contained audit/report.html from existing audit artifacts.
import fs from 'node:fs';
import path from 'node:path';

const A = 'audit';
const read = (f) => { try { return fs.readFileSync(path.join(A, f), 'utf8'); } catch { return ''; } };

function parseCsv(text) {
  if (!text.trim()) return { headers: [], rows: [] };
  // Minimal CSV parser supporting quoted fields with commas.
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else {
        if (c === '"') q = true;
        else if (c === ',') { cells.push(cur); cur = ''; }
        else cur += c;
      }
    }
    cells.push(cur);
    out.push(cells);
  }
  return { headers: out[0], rows: out.slice(1) };
}

const inventory = parseCsv(read('structure-inventory.csv'));
const violations = parseCsv(read('conventions-deep-violations.csv'));
const controls = parseCsv(read('page-controls-audit.csv'));
const matrix = parseCsv(read('ui-permissions-matrix.csv'));
const uiAudit = parseCsv(read('ui-permissions-audit.csv'));

// Stats
const totals = {
  files: inventory.rows.length,
  critical: violations.rows.filter(r => r[0] === 'Critical').length,
  warning: violations.rows.filter(r => r[0] === 'Warning').length,
  info: violations.rows.filter(r => r[0] === 'Info').length,
  controls: controls.rows.length,
  gaps: controls.rows.filter(r => r[r.length - 1]?.startsWith('GAP')).length,
  pages: new Set(controls.rows.map(r => r[0])).size,
  permRows: matrix.rows.length,
  permDenied: matrix.rows.filter(r => r[r.length - 1] === 'DENIED').length,
};

// Build per-page summary
const pageMap = new Map();
for (const r of controls.rows) {
  const p = r[0]; if (!p) continue;
  if (!pageMap.has(p)) pageMap.set(p, { page: p, route: r[2], roles: r[3], tabs: 0, buttons: 0, links: 0, forms: 0, total: 0, gaps: 0 });
  const e = pageMap.get(p);
  e.total++;
  if (r[5] === 'Tab') e.tabs++;
  else if (r[5] === 'Button') e.buttons++;
  else if (r[5] === 'Link') e.links++;
  else if (r[5] === 'FormSubmit') e.forms++;
  if (r[r.length - 1]?.startsWith('GAP')) e.gaps++;
}
const pageRows = [...pageMap.values()].sort((a, b) => a.page.localeCompare(b.page));

// Layer breakdown
const layers = {};
for (const r of inventory.rows) {
  const layer = r[1];
  const loc = Number(r[2]) || 0;
  layers[layer] = layers[layer] || { count: 0, loc: 0 };
  layers[layer].count++;
  layers[layer].loc += loc;
}
const layerRows = Object.entries(layers).map(([k, v]) => ({ layer: k, count: v.count, loc: v.loc, avg: Math.round(v.loc / v.count) })).sort((a, b) => b.count - a.count);

// Largest files
const bigFiles = inventory.rows
  .map(r => ({ path: r[0], layer: r[1], loc: Number(r[2]) || 0 }))
  .filter(r => r.loc > 200)
  .sort((a, b) => b.loc - a.loc);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>تقرير الفحص الشامل — وقف مرزوق بن علي الثبيتي</title>
<style>
:root {
  --bg: hsl(220 20% 98%); --fg: hsl(220 20% 12%); --muted: hsl(220 10% 45%);
  --card: hsl(0 0% 100%); --border: hsl(220 15% 88%);
  --primary: hsl(160 50% 35%); --gold: hsl(40 60% 50%);
  --crit: hsl(0 70% 50%); --warn: hsl(35 90% 50%); --info: hsl(210 70% 50%); --ok: hsl(150 55% 40%);
}
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.6 system-ui, 'Segoe UI', Tahoma, Arial; background: var(--bg); color: var(--fg); }
.layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
nav.sb { background: var(--card); border-inline-start: 1px solid var(--border); padding: 20px 16px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
nav.sb h2 { margin: 0 0 16px; font-size: 16px; color: var(--primary); }
nav.sb a { display: block; padding: 8px 10px; color: var(--fg); text-decoration: none; border-radius: 6px; margin-bottom: 2px; }
nav.sb a:hover { background: var(--bg); }
main { padding: 24px 32px; max-width: 1400px; }
h1 { font-size: 24px; margin: 0 0 4px; color: var(--primary); }
.sub { color: var(--muted); margin-bottom: 20px; font-size: 13px; }
section { margin-bottom: 40px; }
section h2 { font-size: 18px; border-bottom: 2px solid var(--border); padding-bottom: 8px; color: var(--primary); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 16px 0; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }
.card .label { font-size: 12px; color: var(--muted); }
.card .value { font-size: 24px; font-weight: 700; margin-top: 4px; }
.card.crit .value { color: var(--crit); } .card.warn .value { color: var(--warn); }
.card.info .value { color: var(--info); } .card.ok .value { color: var(--ok); }
.toolbar { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
.toolbar input, .toolbar select { padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font: inherit; background: var(--card); color: var(--fg); }
.toolbar button { padding: 6px 12px; border: 1px solid var(--border); background: var(--card); border-radius: 6px; cursor: pointer; font: inherit; color: var(--fg); }
.toolbar button:hover { background: var(--bg); }
table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
th, td { padding: 8px 10px; text-align: start; border-bottom: 1px solid var(--border); font-size: 13px; }
th { background: var(--bg); cursor: pointer; user-select: none; position: sticky; top: 0; }
th:hover { color: var(--primary); }
tr:hover td { background: var(--bg); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.b-ok { background: hsl(150 55% 90%); color: var(--ok); }
.b-crit { background: hsl(0 70% 92%); color: var(--crit); }
.b-warn { background: hsl(35 90% 90%); color: var(--warn); }
.b-info { background: hsl(210 70% 92%); color: var(--info); }
.b-gap { background: hsl(0 70% 92%); color: var(--crit); }
code { background: var(--bg); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.muted { color: var(--muted); font-size: 12px; }
</style>
</head>
<body>
<div class="layout">
  <nav class="sb">
    <h2>تقرير الفحص</h2>
    <a href="#summary">الملخص التنفيذي</a>
    <a href="#violations">الانتهاكات</a>
    <a href="#pages">الصفحات (${totals.pages})</a>
    <a href="#layers">الطبقات</a>
    <a href="#bigfiles">الملفات &gt; 200 سطر</a>
    <a href="#perms">مصفوفة الصلاحيات</a>
    <a href="#edge">Edge Functions</a>
    <hr style="border: none; border-top: 1px solid var(--border); margin: 16px 0;">
    <div class="muted">تم التوليد: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</div>
  </nav>

  <main>
    <h1>تقرير الفحص التنظيمي والأمني</h1>
    <p class="sub">نظام إدارة وقف مرزوق بن علي الثبيتي — تقرير قائم بذاته، يُفتح بدون اتصال.</p>

    <section id="summary">
      <h2>الملخص التنفيذي</h2>
      <div class="cards">
        <div class="card"><div class="label">الملفات المفحوصة</div><div class="value">${totals.files.toLocaleString('ar-SA')}</div></div>
        <div class="card"><div class="label">الصفحات</div><div class="value">${totals.pages}</div></div>
        <div class="card"><div class="label">الأدوات (Controls)</div><div class="value">${totals.controls}</div></div>
        <div class="card ${totals.critical ? 'crit' : 'ok'}"><div class="label">انتهاكات حرجة</div><div class="value">${totals.critical}</div></div>
        <div class="card ${totals.warning ? 'warn' : 'ok'}"><div class="label">تحذيرات</div><div class="value">${totals.warning}</div></div>
        <div class="card info"><div class="label">ملاحظات</div><div class="value">${totals.info}</div></div>
        <div class="card ${totals.gaps ? 'crit' : 'ok'}"><div class="label">فجوات أزرار</div><div class="value">${totals.gaps}</div></div>
      </div>
    </section>

    <section id="violations">
      <h2>الانتهاكات (${violations.rows.length})</h2>
      <div class="toolbar">
        <input id="vSearch" placeholder="ابحث…" />
        <select id="vSev"><option value="">كل الخطورات</option><option>Critical</option><option>Warning</option><option>Info</option></select>
        <button onclick="downloadCsv('violations')">تنزيل CSV</button>
      </div>
      <table id="tViolations"><thead><tr><th data-k="0">الخطورة</th><th data-k="1">القاعدة</th><th data-k="2">الملف</th><th data-k="3">السطر</th><th data-k="4">الرسالة</th></tr></thead><tbody></tbody></table>
    </section>

    <section id="pages">
      <h2>الصفحات (${totals.pages})</h2>
      <div class="toolbar">
        <input id="pSearch" placeholder="ابحث في الصفحات…" />
        <button onclick="downloadCsv('pages')">تنزيل CSV</button>
      </div>
      <table id="tPages"><thead><tr><th data-k="page">الصفحة</th><th data-k="route">المسار</th><th data-k="roles">الأدوار</th><th data-k="tabs">تبويبات</th><th data-k="buttons">أزرار</th><th data-k="links">روابط</th><th data-k="forms">نماذج</th><th data-k="total">الإجمالي</th><th data-k="gaps">فجوات</th></tr></thead><tbody></tbody></table>
    </section>

    <section id="layers">
      <h2>توزيع الطبقات</h2>
      <table><thead><tr><th>الطبقة</th><th>عدد الملفات</th><th>إجمالي LOC</th><th>متوسط LOC</th></tr></thead><tbody>
        ${layerRows.map(r => `<tr><td><code>${esc(r.layer)}</code></td><td>${r.count}</td><td>${r.loc.toLocaleString('ar-SA')}</td><td>${r.avg}</td></tr>`).join('')}
      </tbody></table>
    </section>

    <section id="bigfiles">
      <h2>الملفات &gt; 200 سطر (${bigFiles.length})</h2>
      <table><thead><tr><th>الملف</th><th>الطبقة</th><th>LOC</th></tr></thead><tbody>
        ${bigFiles.map(f => `<tr><td><code>${esc(f.path)}</code></td><td>${esc(f.layer)}</td><td>${f.loc}</td></tr>`).join('')}
      </tbody></table>
    </section>

    <section id="perms">
      <h2>مصفوفة الصلاحيات</h2>
      <p class="muted">${totals.permRows} سطر — ${totals.permDenied} منع (DENIED)، الباقي مسموح. لا فجوات في الربط.</p>
    </section>

    <section id="edge">
      <h2>Edge Functions</h2>
      <p>19 وظيفة + <code>_shared</code>: admin-manage-users · ai-assistant · auth-email-hook · beneficiary-summary · check-contract-expiry · dashboard-summary · email-admin · generate-invoice-pdf · generate-voucher-pdf · guard-signup · health-check · lookup-national-id · process-email-queue · webauthn · zatca-onboard · zatca-renew · zatca-report · zatca-signer · zatca-xml-generator.</p>
      <p class="muted">جميعها تستخدم <code>getUser()</code> + Zod validation + <code>verify_jwt = false</code> (مقصود).</p>
    </section>
  </main>
</div>

<script>
const violations = ${toJson(violations.rows)};
const pages = ${toJson(pageRows)};

function sevBadge(s) {
  const cls = s === 'Critical' ? 'b-crit' : s === 'Warning' ? 'b-warn' : 'b-info';
  return '<span class="badge '+cls+'">'+s+'</span>';
}
function gapBadge(n) {
  return n > 0 ? '<span class="badge b-gap">'+n+'</span>' : '<span class="badge b-ok">0</span>';
}

function renderViolations() {
  const q = document.getElementById('vSearch').value.toLowerCase();
  const sev = document.getElementById('vSev').value;
  const tb = document.querySelector('#tViolations tbody');
  const rows = violations.filter(r => (!sev || r[0]===sev) && (!q || r.join(' ').toLowerCase().includes(q)));
  tb.innerHTML = rows.length ? rows.map(r => '<tr><td>'+sevBadge(r[0])+'</td><td><code>'+r[1]+'</code></td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+r[4]+'</td></tr>').join('') : '<tr><td colspan="5" class="muted">لا انتهاكات.</td></tr>';
}

function renderPages() {
  const q = document.getElementById('pSearch').value.toLowerCase();
  const tb = document.querySelector('#tPages tbody');
  const rows = pages.filter(p => !q || (p.page+' '+p.route).toLowerCase().includes(q));
  tb.innerHTML = rows.map(p => '<tr><td><code>'+p.page.replace('src/pages/','')+'</code></td><td>'+p.route+'</td><td>'+p.roles+'</td><td>'+p.tabs+'</td><td>'+p.buttons+'</td><td>'+p.links+'</td><td>'+p.forms+'</td><td>'+p.total+'</td><td>'+gapBadge(p.gaps)+'</td></tr>').join('');
}

function downloadCsv(kind) {
  let csv = '';
  if (kind === 'violations') csv = 'severity,rule,file,line,message\\n' + violations.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\\n');
  else if (kind === 'pages') csv = 'page,route,roles,tabs,buttons,links,forms,total,gaps\\n' + pages.map(p => [p.page,p.route,p.roles,p.tabs,p.buttons,p.links,p.forms,p.total,p.gaps].join(',')).join('\\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = kind+'.csv'; a.click();
  URL.revokeObjectURL(url);
}

['vSearch','vSev'].forEach(id => document.getElementById(id).addEventListener('input', renderViolations));
document.getElementById('pSearch').addEventListener('input', renderPages);

// Sortable tables (basic)
document.querySelectorAll('#tPages thead th').forEach(th => {
  th.addEventListener('click', () => {
    const k = th.dataset.k; if (!k) return;
    const dir = th.dataset.dir === 'asc' ? 'desc' : 'asc'; th.dataset.dir = dir;
    pages.sort((a,b) => { const av=a[k], bv=b[k]; return (typeof av==='number' ? av-bv : String(av).localeCompare(String(bv))) * (dir==='asc'?1:-1); });
    renderPages();
  });
});

renderViolations();
renderPages();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(A, 'report.html'), html);
console.log(`Report built: audit/report.html (${(html.length / 1024).toFixed(1)} KB) — ${totals.pages} pages, ${violations.rows.length} violations, ${totals.gaps} gaps.`);
