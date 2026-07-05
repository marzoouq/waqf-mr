/**
 * فحوصات الاتفاقيات — يطبّق قواعد المشروع على ملفات pages/hooks.
 */
import type { CheckResult } from '../types';

const RAW_PAGES = import.meta.glob([
  '/src/pages/**/*.tsx',
  '!/src/pages/**/*.test.tsx',
  '!/src/pages/**/*.spec.tsx',
], { query: '?raw', import: 'default', eager: false });
const RAW_HOOKS = import.meta.glob([
  '/src/hooks/**/*.ts',
  '!/src/hooks/**/*.test.ts',
  '!/src/hooks/**/*.spec.ts',
], { query: '?raw', import: 'default', eager: false });

async function readAll(map: Record<string, () => Promise<unknown>>): Promise<{ file: string; src: string }[]> {
  const entries = Object.entries(map);
  return Promise.all(entries.map(async ([file, load]) => {
    try { return { file, src: (await load()) as string }; }
    catch { return { file, src: '' }; }
  }));
}

export async function checkConvFileSize(): Promise<CheckResult> {
  const id = 'conv_file_size';
  const pages = await readAll(RAW_PAGES);
  const hooks = await readAll(RAW_HOOKS);
  const tooBigPages = pages.filter(p => p.src.split('\n').length > 200);
  const tooBigHooks = hooks.filter(h => h.src.split('\n').length > 180);
  const total = tooBigPages.length + tooBigHooks.length;
  if (total === 0) return { id, label: 'حدود حجم الملفات', status: 'pass', detail: 'كل الـ pages ≤200 سطر والـ hooks ≤180' };
  const sample = [...tooBigPages, ...tooBigHooks].slice(0, 3).map(f => f.file.split('/').pop()).join('، ');
  return { id, label: 'حدود حجم الملفات', status: 'warn', detail: `${total} ملف يتجاوز الحد: ${sample}` };
}

export async function checkConvNoConsole(): Promise<CheckResult> {
  const id = 'conv_no_console';
  const pages = await readAll(RAW_PAGES);
  const offenders = pages.filter(p => /\bconsole\.(log|warn|error|info|debug)\(/.test(p.src));
  if (offenders.length === 0) return { id, label: 'لا console مباشر في pages', status: 'pass', detail: 'كل الـ pages تستخدم logger' };
  return { id, label: 'لا console مباشر في pages', status: 'warn', detail: `${offenders.length} ملف: ${offenders.slice(0, 3).map(o => o.file.split('/').pop()).join('، ')}` };
}

export async function checkConvNoHexColors(): Promise<CheckResult> {
  const id = 'conv_no_hex_colors';
  const pages = await readAll(RAW_PAGES);
  // hex خارج تعليقات/strings تقريبًا — heuristic بسيط: #xxxxxx خارج classNames بدون كلمة canvas/svg/print
  const offenders = pages.filter(p => {
    const matches = [...p.src.matchAll(/#[0-9a-fA-F]{6}\b/g)];
    if (matches.length === 0) return false;
    // استثناء ملفات Canvas/SVG/print
    if (/canvas|svg|jspdf|print/i.test(p.file)) return false;
    return true;
  });
  if (offenders.length === 0) return { id, label: 'لا hex خارج Canvas/SVG/Print', status: 'pass', detail: 'كل الألوان عبر hsl(var(--*))' };
  return { id, label: 'لا hex خارج Canvas/SVG/Print', status: 'warn', detail: `${offenders.length} ملف يحتوي hex: ${offenders.slice(0, 3).map(o => o.file.split('/').pop()).join('، ')}` };
}

export async function checkConvRtlHtmlDir(): Promise<CheckResult> {
  const id = 'conv_rtl_html_dir';
  if (typeof document === 'undefined') return { id, label: 'dir="rtl" و lang="ar"', status: 'info', detail: 'غير متاح خارج المتصفح' };
  const html = document.documentElement;
  const dir = html.getAttribute('dir');
  const lang = html.getAttribute('lang');
  if (dir === 'rtl' && lang?.startsWith('ar')) return { id, label: 'dir="rtl" و lang="ar"', status: 'pass', detail: `dir=${dir} lang=${lang}` };
  return { id, label: 'dir="rtl" و lang="ar"', status: 'fail', detail: `dir=${dir ?? 'مفقود'} lang=${lang ?? 'مفقود'}` };
}

export async function checkConvFiscalYearStorage(): Promise<CheckResult> {
  const id = 'conv_fiscal_year_storage';
  if (typeof localStorage === 'undefined') return { id, label: 'fiscal_year_id ليس في localStorage', status: 'info', detail: 'غير متاح' };
  const keys = Object.keys(localStorage);
  const offenders = keys.filter(k => k.toLowerCase().includes('fiscal_year'));
  if (offenders.length === 0) return { id, label: 'fiscal_year_id ليس في localStorage', status: 'pass', detail: 'مطابق للقاعدة الأساسية' };
  return { id, label: 'fiscal_year_id ليس في localStorage', status: 'fail', detail: `مفاتيح ممنوعة: ${offenders.join('، ')}` };
}
