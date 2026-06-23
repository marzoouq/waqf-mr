/**
 * مُشغّلات الفحوصات التشخيصية — تم استخراجها من checks.ts للالتزام بحدّ ≤200 سطر/ملف
 */
import { diagnosticCategories, LIGHT_CATEGORY_TITLES } from './registry';
import type { CheckResult } from './types';

/** خيارات اختيارية لتشغيل الفحص مع دعم progress و cancel. */
export interface RunAuditOptions {
  onProgress?: (info: { done: number; total: number; current: string }) => void;
  signal?: AbortSignal;
}

function totalChecksCount(): number {
  return diagnosticCategories.reduce((s, c) => s + c.checks.length, 0);
}

export async function runAllDiagnostics(opts: RunAuditOptions = {}): Promise<{ category: string; results: CheckResult[] }[]> {
  const { onProgress, signal } = opts;
  const total = totalChecksCount();
  let done = 0;
  const output: { category: string; results: CheckResult[] }[] = [];
  for (const cat of diagnosticCategories) {
    if (signal?.aborted) break;
    const results: CheckResult[] = [];
    for (const fn of cat.checks) {
      if (signal?.aborted) break;
      results.push(await fn());
      done += 1;
      onProgress?.({ done, total, current: cat.title });
    }
    output.push({ category: cat.title, results });
    await new Promise<void>(r => setTimeout(r, 0));
  }
  return output;
}

/**
 * F4: تشغيل البطاقات الخفيفة فقط (بلا DB/Edge) — يُستدعى من autoRun.
 */
export async function runLightDiagnostics(opts: RunAuditOptions = {}): Promise<{ category: string; results: CheckResult[] }[]> {
  const { onProgress, signal } = opts;
  const lightCats = diagnosticCategories.filter(c => LIGHT_CATEGORY_TITLES.has(c.title));
  const total = lightCats.reduce((s, c) => s + c.checks.length, 0);
  let done = 0;
  const output: { category: string; results: CheckResult[] }[] = [];
  for (const cat of lightCats) {
    if (signal?.aborted) break;
    const results: CheckResult[] = [];
    for (const fn of cat.checks) {
      if (signal?.aborted) break;
      results.push(await fn());
      done += 1;
      onProgress?.({ done, total, current: cat.title });
    }
    output.push({ category: cat.title, results });
    await new Promise<void>(r => setTimeout(r, 0));
  }
  return output;
}

/** تشغيل فحوصات بطاقة واحدة فقط حسب العنوان */
export async function runCategoryDiagnostics(categoryTitle: string): Promise<{ category: string; results: CheckResult[] } | null> {
  const cat = diagnosticCategories.find(c => c.title === categoryTitle);
  if (!cat) return null;
  const results = await Promise.all(cat.checks.map(fn => fn()));
  return { category: cat.title, results };
}

/**
 * تشغيل فحوصات محدَّدة بـ ids — يستخدمه زر «إعادة الفاشلة فقط».
 */
export async function runByIds(ids: string[]): Promise<{ category: string; results: CheckResult[] }[]> {
  const want = new Set(ids);
  const output: { category: string; results: CheckResult[] }[] = [];
  for (const cat of diagnosticCategories) {
    const matched: CheckResult[] = [];
    for (const fn of cat.checks) {
      const r = await fn();
      if (want.has(r.id)) matched.push(r);
      if (matched.length === want.size) break;
    }
    if (matched.length) output.push({ category: cat.title, results: matched });
    if (output.reduce((s, c) => s + c.results.length, 0) >= want.size) break;
  }
  return output;
}
