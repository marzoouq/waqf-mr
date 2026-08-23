#!/usr/bin/env node
/**
 * بوابة أمان التبعيات — ترفض الدمج عند وجود أي ثغرة high/critical.
 *
 * - تشغّل `npm audit --json` لكل التبعيات (prod + dev) وتصنّف النتائج.
 * - تعتبر ثغرات prod حاجزة (blocking) دائماً؛ وثغرات dev-only حاجزة فقط عند
 *   `--strict-dev` (أو STRICT_DEV=true) لأنها لا تُشحن للمتصفح.
 * - تُنتج تقريرين: `audit/dependency-security.json` و`audit/dependency-security.md`
 *   وتُلحق ملخصاً بـ `$GITHUB_STEP_SUMMARY` مع ربطه بتقارير docs/security.
 *
 * Exit codes: 0 = نظيف، 1 = ثغرات حاجزة، 2 = فشل تشغيل التدقيق.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const BLOCKING_LEVELS = ['critical', 'high'];
const STRICT_DEV = process.argv.includes('--strict-dev') || process.env.STRICT_DEV === 'true';
const OUT_DIR = 'audit';
const DOCS_DIR = join('docs', 'security');

function runAudit() {
  try {
    const out = execFileSync('npm', ['audit', '--json', '--legacy-peer-deps'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out);
  } catch (error) {
    // npm audit يخرج بكود != 0 عند وجود ثغرات، لكن stdout يبقى JSON صالحاً
    const stdout = error?.stdout?.toString?.() ?? '';
    if (stdout.trim().startsWith('{')) {
      try {
        return JSON.parse(stdout);
      } catch {
        /* fallthrough */
      }
    }
    console.error('::error::تعذّر تشغيل npm audit — لا يمكن التحقق من أمان التبعيات.');
    console.error(error?.stderr?.toString?.() || error?.message || String(error));
    process.exit(2);
  }
}

function collect(report) {
  const advisories = [];
  const vulns = report.vulnerabilities || {};
  for (const [name, entry] of Object.entries(vulns)) {
    const severity = entry.severity;
    if (!BLOCKING_LEVELS.includes(severity)) continue;
    const via = (entry.via || []).filter((v) => typeof v === 'object');
    const titles = via.length ? via.map((v) => v.title).filter(Boolean) : ['—'];
    const urls = via.map((v) => v.url).filter(Boolean);
    advisories.push({
      package: name,
      severity,
      isDirect: Boolean(entry.isDirect),
      devOnly: entry.effects?.length === 0 ? Boolean(entry.isDirect && isDevDep(name)) : isDevDep(name),
      range: entry.range || '—',
      fixAvailable: entry.fixAvailable === false ? false : entry.fixAvailable,
      titles,
      urls: [...new Set(urls)],
    });
  }
  return advisories.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
}

let devDeps = new Set();
function isDevDep(name) {
  return devDeps.has(name);
}

function loadDevDeps() {
  try {
    const pkg = JSON.parse(execFileSync('node', ['-e', 'process.stdout.write(require("fs").readFileSync("package.json","utf8"))'], { encoding: 'utf8' }));
    devDeps = new Set(Object.keys(pkg.devDependencies || {}));
  } catch {
    devDeps = new Set();
  }
}

function relatedReports() {
  if (!existsSync(DOCS_DIR)) return [];
  const all = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'));
  const scans = all.filter((f) => /^SECURITY-SCAN-/i.test(f)).sort().reverse().slice(0, 3);
  const others = all.filter((f) => !/^SECURITY-SCAN-/i.test(f)).sort().slice(0, 3);
  return [...scans, ...others].map((f) => `${DOCS_DIR}/${f}`);
}

function main() {
  loadDevDeps();
  const report = runAudit();
  const meta = report.metadata?.vulnerabilities || {};
  const advisories = collect(report);
  const blocking = advisories.filter((a) => STRICT_DEV || !a.devOnly);
  const reports = relatedReports();

  const payload = {
    generated_at: new Date().toISOString(),
    strict_dev: STRICT_DEV,
    totals: {
      critical: meta.critical || 0,
      high: meta.high || 0,
      moderate: meta.moderate || 0,
      low: meta.low || 0,
      info: meta.info || 0,
    },
    blocking_count: blocking.length,
    advisories,
    linked_reports: reports,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'dependency-security.json'), `${JSON.stringify(payload, null, 2)}\n`);

  const lines = [
    '## 🔒 بوابة أمان التبعيات',
    '',
    '| المستوى | العدد |',
    '|---|---|',
    `| Critical | ${payload.totals.critical} |`,
    `| High | ${payload.totals.high} |`,
    `| Moderate | ${payload.totals.moderate} |`,
    `| Low | ${payload.totals.low} |`,
    '',
  ];

  if (advisories.length === 0) {
    lines.push('✅ لا ثغرات high/critical — الدمج مسموح.', '');
  } else {
    lines.push('| الحزمة | الخطورة | النطاق | نوع | إصلاح متاح | الثغرة |', '|---|---|---|---|---|---|');
    for (const a of advisories) {
      const fix = a.fixAvailable === false ? '❌' : '✅';
      lines.push(
        `| \`${a.package}\` | ${a.severity} | ${a.range} | ${a.devOnly ? 'dev' : 'prod'} | ${fix} | ${a.titles.join('؛ ')} |`,
      );
    }
    lines.push('');
    if (blocking.length > 0) {
      lines.push(`❌ **الدمج مرفوض:** ${blocking.length} ثغرة حاجزة (high/critical).`, '');
    } else {
      lines.push('⚠️ ثغرات dev-only فقط — غير حاجزة (فعّل `--strict-dev` لجعلها حاجزة).', '');
    }
  }

  if (reports.length > 0) {
    lines.push('### التقارير الأمنية المرتبطة', '', ...reports.map((r) => `- \`${r}\``), '');
  }
  lines.push('التقرير الكامل: artifact `dependency-security-report` (`audit/dependency-security.json`).');

  const md = lines.join('\n');
  writeFileSync(join(OUT_DIR, 'dependency-security.md'), `${md}\n`);
  console.log(md);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`);
  }

  if (blocking.length > 0) {
    for (const a of blocking) {
      console.error(`::error title=${a.severity} vulnerability::${a.package} (${a.range}) — ${a.titles.join('؛ ')}`);
    }
    process.exit(1);
  }
}

main();
