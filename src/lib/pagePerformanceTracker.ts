/**
 * تتبع أوقات تحميل الصفحات — يُسجّل وقت كل انتقال بين المسارات
 */

export interface PageLoadEntry {
  path: string;
  /** اسم الصفحة بالعربي */
  label: string;
  /** وقت التحميل بالمللي ثانية */
  durationMs: number;
  /** طابع زمني */
  timestamp: number;
}

const MAX_ENTRIES = 100;
const STORAGE_KEY = 'page_perf_entries';

/** تسميات الصفحات بالعربي */
const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/dashboard/properties': 'العقارات',
  '/dashboard/contracts': 'العقود',
  '/dashboard/income': 'الإيرادات',
  '/dashboard/expenses': 'المصروفات',
  '/dashboard/beneficiaries': 'المستفيدون',
  '/dashboard/reports': 'التقارير',
  '/dashboard/accounts': 'الحسابات الختامية',
  '/dashboard/messages': 'الرسائل',
  '/dashboard/invoices': 'الفواتير',
  '/dashboard/audit-log': 'سجل المراجعة',
  '/dashboard/bylaws': 'النظام الأساسي',
  '/dashboard/settings': 'الإعدادات',
  '/dashboard/support': 'الدعم الفني',
  '/dashboard/diagnostics': 'تشخيص النظام',
  '/beneficiary': 'بوابة المستفيد',
};

function getPageLabel(path: string): string {
  return PAGE_LABELS[path] || path;
}

/** جلب السجلات المحفوظة */
export function getStoredEntries(): PageLoadEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** حفظ سجل جديد */
export function recordPageLoad(path: string, durationMs: number): void {
  const entries = getStoredEntries();
  entries.push({
    path,
    label: getPageLabel(path),
    durationMs: Math.round(durationMs),
    timestamp: Date.now(),
  });

  // الاحتفاظ بآخر N سجل فقط
  while (entries.length > MAX_ENTRIES) entries.shift();

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // تجاوز — sessionStorage ممتلئ أو غير متاح
  }
}

/** مسح السجلات */
export function clearPageLoadEntries(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** ملخص إحصائي مجمّع حسب المسار */
export interface PagePerfSummary {
  path: string;
  label: string;
  avgMs: number;
  maxMs: number;
  minMs: number;
  count: number;
  lastMs: number;
}

export function getPagePerfSummaries(): PagePerfSummary[] {
  const entries = getStoredEntries();
  const grouped: Record<string, PageLoadEntry[]> = {};

  for (const e of entries) {
    if (!grouped[e.path]) grouped[e.path] = [];
    grouped[e.path].push(e);
  }

  return Object.entries(grouped)
    .map(([path, items]) => {
      const durations = items.map(i => i.durationMs);
      return {
        path,
        label: getPageLabel(path),
        avgMs: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        maxMs: Math.max(...durations),
        minMs: Math.min(...durations),
        count: items.length,
        lastMs: items[items.length - 1].durationMs,
      };
    })
    .sort((a, b) => b.avgMs - a.avgMs); // الأبطأ أولاً
}

/** إشعار المراقبين بتحديث البيانات */
let revision = 0;
const listeners = new Set<() => void>();

export function subscribePerfUpdates(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function getPerfRevision() { return revision; }

export function notifyPerfUpdate() {
  revision++;
  listeners.forEach(cb => cb());
}
