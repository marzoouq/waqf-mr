/**
 * مصدّرات تقرير التشخيص — JSON ثري + نص عادي.
 */
import { sanitizeDiagnosticOutput } from './sanitize';
import { getCheckMeta } from './checkMeta';
import type { CheckResult, CheckStatus } from './types';
import { fmtDateTime } from '@/utils/format/format';

export interface CategoryResults {
  category: string;
  results: CheckResult[];
}

export interface DiagnosticsSummary {
  total: number;
  pass: number;
  warn: number;
  fail: number;
  info: number;
  healthScore: number;
}

export interface JsonReport {
  schemaVersion: 1;
  generatedAt: string;
  app: {
    version: string;
    env: string;
    userAgent: string;
    route: string;
  };
  summary: DiagnosticsSummary;
  categories: {
    title: string;
    results: (CheckResult & { category: string; sourceFile: string; docLink: string })[];
  }[];
}

export function computeSummary(categories: CategoryResults[]): DiagnosticsSummary {
  let pass = 0, warn = 0, fail = 0, info = 0;
  for (const c of categories) {
    for (const r of c.results) {
      if (r.status === 'pass') pass++;
      else if (r.status === 'warn') warn++;
      else if (r.status === 'fail') fail++;
      else info++;
    }
  }
  const total = pass + warn + fail + info;
  const meaningful = pass + warn + fail;
  const healthScore = meaningful === 0 ? 100 : Math.round((pass / meaningful) * 100);
  return { total, pass, warn, fail, info, healthScore };
}

export function toJsonReport(categories: CategoryResults[]): JsonReport {
  const enriched = categories.map(cat => ({
    title: cat.category,
    results: cat.results.map(r => {
      const meta = getCheckMeta(r.id);
      return {
        ...r,
        detail: sanitizeDiagnosticOutput(r.detail),
        category: cat.category,
        sourceFile: meta.sourceFile,
        docLink: meta.docAnchor,
      };
    }),
  }));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    app: {
      version: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'unknown',
      env: (import.meta.env.MODE as string | undefined) ?? 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      route: typeof window !== 'undefined' ? window.location.pathname : '/',
    },
    summary: computeSummary(categories),
    categories: enriched,
  };
}

export function toTextReport(categories: CategoryResults[]): string {
  const summary = computeSummary(categories);
  const header = [
    `تقرير تشخيص النظام — ${fmtDateTime(new Date())}`,
    `الإصدار: ${(import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'unknown'}`,
    `النتيجة: ${summary.healthScore}/100 (${summary.pass} ناجح | ${summary.warn} تحذير | ${summary.fail} فشل | ${summary.info} معلومة)`,
  ].join('\n');
  const body = categories.flatMap(cat => [
    `\n═══ ${cat.category} ═══`,
    ...cat.results.map(r => `[${r.status.toUpperCase()}] ${r.label}: ${sanitizeDiagnosticOutput(r.detail)}`),
  ]).join('\n');
  return `${header}\n${body}`;
}

function isoFilename(ext: string): string {
  const iso = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `diagnostics-${iso}.${ext}`;
}

export function downloadBlob(content: string, mime: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(categories: CategoryResults[]): void {
  downloadBlob(JSON.stringify(toJsonReport(categories), null, 2), 'application/json', isoFilename('json'));
}

export function downloadText(categories: CategoryResults[]): void {
  downloadBlob(toTextReport(categories), 'text/plain', isoFilename('txt'));
}

export function collectFailedIds(categories: CategoryResults[], includeWarn = false): string[] {
  const ids: string[] = [];
  const targets: CheckStatus[] = includeWarn ? ['fail', 'warn'] : ['fail'];
  for (const c of categories) for (const r of c.results) if (targets.includes(r.status)) ids.push(r.id);
  return ids;
}
