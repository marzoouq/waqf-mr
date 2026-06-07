/**
 * فحوصات التفاعلات — تبويبات وأزرار في كل الصفحات.
 * يستخدم import.meta.glob بـ as: 'raw' لقراءة مصدر الملفات دون تحميلها.
 */
import type { CheckResult } from '../types';

const RAW_PAGES = import.meta.glob('/src/pages/**/*.tsx', { query: '?raw', import: 'default', eager: false });

async function loadAllSources(): Promise<{ file: string; source: string }[]> {
  const entries = Object.entries(RAW_PAGES).filter(([f]) => !f.endsWith('.test.tsx'));
  const results = await Promise.all(entries.map(async ([f, loader]) => {
    try {
      const source = (await (loader as () => Promise<string>)()) as string;
      return { file: f, source };
    } catch {
      return { file: f, source: '' };
    }
  }));
  return results;
}

export interface InteractionsAuditRow {
  file: string;
  type: 'tabs' | 'handler_less_button' | 'duplicate_tab_id' | 'missing_aria';
  detail: string;
  severity: 'pass' | 'warn' | 'fail' | 'info';
}

let cachedRows: InteractionsAuditRow[] | null = null;

export async function getInteractionsRows(force = false): Promise<InteractionsAuditRow[]> {
  if (cachedRows && !force) return cachedRows;
  const sources = await loadAllSources();
  const rows: InteractionsAuditRow[] = [];
  for (const { file, source } of sources) {
    if (!source) continue;
    const short = file.replace('/src/pages/', '');

    // 1) tabs inventory
    const tabValues = [...source.matchAll(/<TabsTrigger[^>]*\svalue=["'`]([^"'`]+)["'`]/g)].map(m => m[1] as string);
    if (tabValues.length) {
      rows.push({ file: short, type: 'tabs', severity: 'info', detail: `${tabValues.length} تبويب: ${tabValues.slice(0, 6).join('، ')}` });
      // duplicates
      const seen = new Set<string>(), dups = new Set<string>();
      for (const v of tabValues) { if (seen.has(v)) dups.add(v); else seen.add(v); }
      if (dups.size) rows.push({ file: short, type: 'duplicate_tab_id', severity: 'fail', detail: `قيم مكررة: ${[...dups].join('، ')}` });
    }

    // 2) handler-less buttons — heuristic: <Button ...> بلا onClick/type="submit"/asChild داخل نفس فتح الوسم
    const buttonOpens = [...source.matchAll(/<Button\b[^>]*>/g)].map(m => m[0]);
    let handlerLess = 0;
    for (const tag of buttonOpens) {
      if (/onClick\s*=/.test(tag)) continue;
      if (/type\s*=\s*["'`]submit["'`]/.test(tag)) continue;
      if (/\basChild\b/.test(tag)) continue;
      if (/\bdisabled\b/.test(tag)) continue;
      handlerLess++;
    }
    if (handlerLess > 0) rows.push({ file: short, type: 'handler_less_button', severity: 'warn', detail: `${handlerLess} زر بدون onClick/submit/asChild` });

    // 3) icon-only buttons missing aria-label
    const iconButtons = [...source.matchAll(/<Button\b[^>]*size=["'`]icon["'`][^>]*>/g)].map(m => m[0]);
    let missingAria = 0;
    for (const tag of iconButtons) {
      if (!/aria-label\s*=/.test(tag)) missingAria++;
    }
    if (missingAria > 0) rows.push({ file: short, type: 'missing_aria', severity: 'warn', detail: `${missingAria} زر أيقونة بدون aria-label` });
  }
  cachedRows = rows;
  return rows;
}

export async function checkInteractionsTabsInventory(): Promise<CheckResult> {
  const id = 'interactions_tabs_inventory';
  const rows = await getInteractionsRows();
  const tabRows = rows.filter(r => r.type === 'tabs');
  const totalTabs = tabRows.reduce((s, r) => s + (parseInt(r.detail) || 0), 0);
  return { id, label: 'جرد التبويبات', status: 'info', detail: `${tabRows.length} صفحة فيها تبويبات (${totalTabs} تبويب)` };
}

export async function checkInteractionsHandlerLess(): Promise<CheckResult> {
  const id = 'interactions_handler_less_buttons';
  const rows = await getInteractionsRows();
  const bad = rows.filter(r => r.type === 'handler_less_button');
  if (bad.length === 0) return { id, label: 'أزرار بدون معالج', status: 'pass', detail: 'كل الأزرار مرتبطة' };
  const total = bad.reduce((s, r) => s + (parseInt(r.detail) || 0), 0);
  return { id, label: 'أزرار بدون معالج', status: 'warn', detail: `${total} زر في ${bad.length} صفحة` };
}

export async function checkInteractionsDuplicateTabs(): Promise<CheckResult> {
  const id = 'interactions_duplicate_tab_ids';
  const rows = await getInteractionsRows();
  const bad = rows.filter(r => r.type === 'duplicate_tab_id');
  if (bad.length === 0) return { id, label: 'تبويبات مكرّرة', status: 'pass', detail: 'لا توجد قيم مكرّرة' };
  return { id, label: 'تبويبات مكرّرة', status: 'fail', detail: `${bad.length} حالة: ${bad.slice(0, 3).map(b => b.file).join('، ')}` };
}

export async function checkInteractionsMissingAria(): Promise<CheckResult> {
  const id = 'interactions_missing_aria_labels';
  const rows = await getInteractionsRows();
  const bad = rows.filter(r => r.type === 'missing_aria');
  if (bad.length === 0) return { id, label: 'aria-label للأيقونات', status: 'pass', detail: 'كل أزرار الأيقونات معنونة' };
  return { id, label: 'aria-label للأيقونات', status: 'warn', detail: `${bad.length} صفحة بها نقص` };
}
