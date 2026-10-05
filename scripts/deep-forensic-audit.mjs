#!/usr/bin/env node
/**
 * deep-forensic-audit.mjs — فحص جنائي شامل للكود وقاعدة البيانات (عبر الهجرات) ومنطق الأعمال.
 * يُصدّر audit/forensics/DEEP-SCAN-REPORT.{json,md}. يخرج بـ 1 عند وجود Critical.
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const findings = [];
const add = (severity, area, rule, file, detail) => findings.push({ severity, area, rule, file, detail });

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}
const rel = (p) => relative(ROOT, p);
const read = (p) => readFileSync(p, 'utf8');
const isTest = (p) => /\.(test|spec)\.tsx?$/.test(p) || p.includes('/src/test/');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// ═══ 1. الكود والمعمارية ═══
const srcFiles = walk(join(ROOT, 'src'), ['.ts', '.tsx']).filter((p) => !isTest(p));
for (const f of srcFiles) {
  const r = rel(f);
  if (r.startsWith('src/integrations/supabase/')) continue;
  const code = stripComments(read(f));
  const lines = read(f).split('\n').length;

  if (/\bconsole\.(log|warn|error|info|debug)\s*\(/.test(code) && !r.startsWith('src/lib/logger'))
    add('gap', 'code', 'no-console', r, 'استدعاء console مباشر بدل logger');
  if (r.startsWith('src/pages/') && /from ['"]@\/integrations\/supabase\/client['"]/.test(code))
    add('critical', 'architecture', 'no-supabase-in-pages', r, 'صفحة تستورد عميل قاعدة البيانات مباشرة');
  if (r.startsWith('src/utils/')) {
    if (/from ['"]sonner['"]/.test(code)) add('critical', 'architecture', 'utils-pure', r, 'utils يستورد sonner');
    if (/integrations\/supabase\/client/.test(code)) add('critical', 'architecture', 'utils-pure', r, 'utils يستورد عميل قاعدة البيانات');
    if (/from ['"]@\/hooks\/data\//.test(code)) add('gap', 'architecture', 'utils-types-source', r, 'utils يستورد من hooks/data');
  }
  if (/localStorage\.(setItem|getItem)\([^)]*(role|fiscal_year)/i.test(code))
    add('critical', 'security', 'storage-sensitive-keys', r, 'دور أو سنة مالية في localStorage');
  if (/\bas any\b|:\s*any\b/.test(code) && !/eslint-disable/.test(read(f)))
    add('gap', 'code', 'no-any', r, 'استخدام any بدون تبرير');
  if (r.startsWith('src/components/') && lines > 200)
    add('info', 'architecture', 'component-size', r, `${lines} سطراً (الحد 200)`);
  if (/dangerouslySetInnerHTML(?![^>]*ld\+json)/.test(code.replace(/<script type="application\/ld\+json"[^>]*>/g, '')) && !/DOMPurify|sanitize/i.test(code))
    add('critical', 'security', 'xss-innerhtml', r, 'dangerouslySetInnerHTML بلا تنقية');
}

// ═══ 2. قاعدة البيانات عبر الهجرات ═══
const migDir = join(ROOT, 'supabase/migrations');
const drizzleDir = join(ROOT, 'drizzle/migrations');
const migs = [...walk(migDir, ['.sql']), ...(existsSync(drizzleDir) ? walk(drizzleDir, ['.sql']) : [])].sort();
const allSql = migs.map((m) => ({ file: rel(m), sql: read(m) }));
const joined = allSql.map((m) => m.sql).join('\n');

// جداول مُنحت صلاحياتها عبر حلقة GRANT ديناميكية (format('GRANT ... %I'))
const loopGranted = new Set();
for (const { sql } of allSql)
  if (/grant[^;]*%I/i.test(sql))
    for (const a of sql.matchAll(/ARRAY\s*\[([^\]]+)\]/gi))
      for (const n of a[1].matchAll(/'(\w+)'/g)) loopGranted.add(n[1].toLowerCase());

// 2a: CREATE TABLE بدون GRANT ولا RLS
const tables = new Map();
for (const { file, sql } of allSql)
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?\s*\(/gi))
    if (!tables.has(m[1].toLowerCase())) tables.set(m[1].toLowerCase(), file);
for (const [t, file] of tables) {
  if (!new RegExp(`alter\\s+table\\s+(?:public\\.)?"?${t}"?\\s+enable\\s+row\\s+level\\s+security`, 'i').test(joined))
    add('critical', 'database', 'rls-missing', file, `جدول ${t} بدون تفعيل RLS في الهجرات`);
  if (!loopGranted.has(t) && !new RegExp(`grant[^;]*on\\s+(?:table\\s+)?(?:public\\.)?"?${t}"?\\b`, 'i').test(joined))
    add('info', 'database', 'grant-missing', file, `جدول ${t} بدون GRANT صريح (قد يعتمد على صلاحيات افتراضية قديمة)`);
}

// 2b: آخر تعريف لكل دالة SECURITY DEFINER يجب أن يضبط search_path
const fnLast = new Map();
for (const { file, sql } of allSql)
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?(\w+)"?\s*\(([\s\S]*?)\$(\w*)\$/gi))
    fnLast.set(m[1].toLowerCase(), { file, header: m[2] });
let definerCount = 0;
for (const [fn, { file, header }] of fnLast) {
  if (!/security\s+definer/i.test(header)) continue;
  definerCount++;
  if (!/search_path/i.test(header) && !new RegExp(`alter\\s+function\\s+(?:public\\.)?${fn}[^;]*search_path`, 'i').test(joined))
    add('gap', 'database', 'definer-search-path', file, `${fn}: SECURITY DEFINER بلا search_path`);
}

// 2c: jwt_role في السياسات — يُتجاهل ما سبق إسقاط الدالة نهائياً (إسقاطها يُفشل أي سياسة حيّة تعتمد عليها)
const jwtDropIdx = allSql.findLastIndex(({ sql }) => /drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?jwt_role\s*\(/i.test(sql));
allSql.forEach(({ file, sql }, i) => {
  if (i <= jwtDropIdx) return;
  if (/create\s+policy[\s\S]{0,400}?jwt_role\(/i.test(sql))
    add('gap', 'database', 'policy-jwt-role', file, 'سياسة تستخدم jwt_role() بدل has_role()');
});

// 2d: سياسة SELECT على حزمة invoices لم تُسقط
const pol = new Map();
for (const { sql } of allSql) {
  for (const m of sql.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+storage\.objects([\s\S]*?);/gi))
    pol.set(m[1], m[2]);
  for (const m of sql.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+storage\.objects/gi)) pol.delete(m[1]);
}
for (const [name, body] of pol)
  if (/for\s+select/i.test(body) && /'invoices'/.test(body))
    add('critical', 'security', 'invoice-bucket-select', 'supabase/migrations', `سياسة قراءة قائمة على invoices: ${name}`);

// ═══ 3. وظائف الحافة ═══
const fnRoot = join(ROOT, 'supabase/functions');
const gatesSrc = existsSync(join(ROOT, 'scripts/security-gates.mjs')) ? read(join(ROOT, 'scripts/security-gates.mjs')) : '';
const edgeFns = existsSync(fnRoot) ? readdirSync(fnRoot).filter((d) => !d.startsWith('_') && existsSync(join(fnRoot, d, 'index.ts'))) : [];
const PUBLIC_FNS = new Set(['auth-email-hook', 'process-email-queue', 'health-check', 'client-context', 'guard-signup', 'diagnostics-edge-ping', 'mcp', 'lookup-national-id', 'webauthn']);
for (const fn of edgeFns) {
  const files = walk(join(fnRoot, fn), ['.ts', '.tsx']).filter((p) => !isTest(p));
  const code = files.map((p) => stripComments(read(p))).join('\n');
  const shared = /_shared\/auth|authenticate(Admin|User|Request)?\(/.test(code);
  const r = `supabase/functions/${fn}`;
  if (/auth\.getSession\(/.test(code)) add('critical', 'edge', 'no-getSession', r, 'استخدام getSession()');
  if (!/getUser\(|getClaims\(/.test(code) && !shared && !PUBLIC_FNS.has(fn))
    add('critical', 'edge', 'auth-missing', r, 'لا تحقق من المستخدم (getUser)');
  if (/req\.json\(\)/.test(code) && !/safeParse|\.parse\(|zod/.test(code))
    add('gap', 'edge', 'zod-missing', r, 'تقرأ body بدون تحقق Zod');
  if (/SUPABASE_SERVICE_ROLE_KEY/.test(code) && !gatesSrc.includes(`'${fn}'`))
    add('critical', 'edge', 'service-role-unlisted', r, 'service role خارج القائمة الموثّقة');
  const hasTest = walk(join(fnRoot, fn), ['.ts']).some(isTest);
  if (!hasTest) add('info', 'testing', 'edge-untested', r, 'وظيفة بلا اختبار');
}

// ═══ 4. منطق الأعمال ═══
const uiFiles = srcFiles.filter((p) => /\.tsx$/.test(p));
for (const f of uiFiles) {
  const code = stripComments(read(f));
  if (/['">]\s*(بيع العقار|شراء العقار|عقد بيع|سعر البيع)/.test(code))
    add('critical', 'business', 'rental-only', rel(f), 'نص يشير إلى بيع/شراء — النظام للتأجير فقط');
  if (/fiscal_year_id/.test(code) && /localStorage/.test(code))
    add('critical', 'business', 'fiscal-session-storage', rel(f), 'fiscal_year_id يجب أن يكون في sessionStorage');
}
// VAT يدوي كمصروف
for (const f of srcFiles) {
  const code = read(f);
  if (/expense_type\s*[:=]\s*['"](ضريبة القيمة المضافة|vat)['"]/i.test(code))
    add('critical', 'business', 'no-manual-vat-expense', rel(f), 'إدخال VAT يدوي كمصروف');
}
// تطابق LRM: يجب أن توجد الخوارزمية في العميل وفي execute_distribution
const lrmClient = srcFiles.some((p) => /largest\s*remainder|largestRemainder/i.test(read(p)));
const execDist = fnLast.get('execute_distribution');
const execSql = execDist ? allSql.filter((m) => /function\s+(public\.)?execute_distribution/i.test(m.sql)).pop()?.sql ?? '' : '';
if (!lrmClient) add('critical', 'business', 'lrm-client', 'src', 'خوارزمية البواقي الكبرى غير موجودة في العميل');
if (!/remainder|frac|floor/i.test(execSql)) add('gap', 'business', 'lrm-server', execDist?.file ?? 'migrations', 'لا دليل على LRM في execute_distribution');
// صيغة السنة المالية
for (const f of srcFiles) {
  const m = read(f).match(/label\s*:\s*['"](\d{4})\/(\d{4})['"]/);
  if (m) add('gap', 'business', 'fy-label-format', rel(f), `صيغة سنة ${m[0]} — المطلوب YYYY-YYYY`);
}

// ═══ 5. فجوات الاختبار ═══
const pages = walk(join(ROOT, 'src/pages'), ['.tsx']).filter((p) => !isTest(p));
const untestedPages = pages.filter((p) => !existsSync(p.replace(/\.tsx$/, '.test.tsx')));
const pageHooks = walk(join(ROOT, 'src/hooks'), ['.ts', '.tsx']).filter((p) => !isTest(p) && !p.endsWith('index.ts'));
const untestedHooks = pageHooks.filter((p) => !existsSync(p.replace(/\.tsx?$/, '.test.ts')) && !existsSync(p.replace(/\.tsx?$/, '.test.tsx')));

// ═══ التقرير ═══
const count = (s) => findings.filter((x) => x.severity === s).length;
const summary = {
  generated_at: new Date().toISOString(),
  scanned: { src_files: srcFiles.length, migrations: migs.length, tables: tables.size, security_definer_functions: definerCount, edge_functions: edgeFns.length },
  coverage: { pages: pages.length, untested_pages: untestedPages.length, hooks: pageHooks.length, untested_hooks: untestedHooks.length },
  totals: { critical: count('critical'), gap: count('gap'), info: count('info') },
};
const outDir = join(ROOT, 'audit/forensics');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'DEEP-SCAN-REPORT.json'), JSON.stringify({ summary, findings }, null, 2));

const byRule = {};
for (const x of findings) (byRule[`${x.severity}|${x.area}|${x.rule}`] ??= []).push(x);
let md = `# تقرير الفحص الجنائي الشامل\n\nتاريخ: ${summary.generated_at}\n\n`;
md += `| المؤشر | القيمة |\n|---|---|\n`;
for (const [k, v] of Object.entries({ ...summary.scanned, ...summary.coverage, ...summary.totals })) md += `| ${k} | ${v} |\n`;
for (const sev of ['critical', 'gap', 'info']) {
  md += `\n## ${sev.toUpperCase()}\n`;
  for (const [key, list] of Object.entries(byRule).filter(([k]) => k.startsWith(sev))) {
    md += `\n### ${key.split('|').slice(1).join(' / ')} (${list.length})\n`;
    for (const x of list.slice(0, 40)) md += `- \`${x.file}\` — ${x.detail}\n`;
    if (list.length > 40) md += `- … و${list.length - 40} أخرى (انظر JSON)\n`;
  }
}
writeFileSync(join(outDir, 'DEEP-SCAN-REPORT.md'), md);

console.log('━━━ الفحص الجنائي الشامل ━━━');
console.log(JSON.stringify(summary, null, 2));
for (const [key, list] of Object.entries(byRule)) console.log(`${key.padEnd(55)} ${list.length}`);
process.exit(summary.totals.critical > 0 ? 1 : 0);
