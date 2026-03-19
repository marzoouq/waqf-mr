/**
 * 26 فحصاً تشخيصياً للنظام — مقسّمة على 6 بطاقات
 */
import { supabase } from '@/integrations/supabase/client';
import { getPagePerfSummaries } from '@/lib/pagePerformanceTracker';
import {
  allAdminLinks, allBeneficiaryLinks, ROUTE_TITLES,
} from '@/components/dashboard-layout/constants';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

// ════════════════════════════════════════════════
// بطاقة 1 — قاعدة البيانات (3)
// ════════════════════════════════════════════════

export async function checkSupabaseConnection(): Promise<CheckResult> {
  const id = 'db_connection';
  try {
    const start = performance.now();
    const { error } = await supabase.from('app_settings').select('key').limit(1);
    const ms = Math.round(performance.now() - start);
    if (error) return { id, label: 'اتصال قاعدة البيانات', status: 'fail', detail: error.message };
    return { id, label: 'اتصال قاعدة البيانات', status: ms > 3000 ? 'warn' : 'pass', detail: `${ms}ms` };
  } catch (e) {
    return { id, label: 'اتصال قاعدة البيانات', status: 'fail', detail: String(e) };
  }
}

export async function checkRealtimeChannels(): Promise<CheckResult> {
  const id = 'db_realtime';
  try {
    const channels = supabase.getChannels();
    return { id, label: 'قنوات Realtime', status: 'info', detail: `${channels.length} قناة نشطة` };
  } catch {
    return { id, label: 'قنوات Realtime', status: 'warn', detail: 'تعذر الفحص' };
  }
}

export async function checkAuthSession(): Promise<CheckResult> {
  const id = 'db_auth';
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { id, label: 'جلسة المصادقة', status: 'fail', detail: 'غير مسجل الدخول' };
    return { id, label: 'جلسة المصادقة', status: 'pass', detail: 'جلسة نشطة' };
  } catch {
    return { id, label: 'جلسة المصادقة', status: 'fail', detail: 'تعذر التحقق' };
  }
}

// ════════════════════════════════════════════════
// بطاقة 2 — المتصفح والأداء (7)
// ════════════════════════════════════════════════

export async function checkNavigatorLocks(): Promise<CheckResult> {
  const id = 'perf_locks';
  const supported = 'locks' in navigator;
  return { id, label: 'Navigator Locks API', status: supported ? 'pass' : 'info', detail: supported ? 'مدعوم' : 'غير مدعوم' };
}

export async function checkScrollPerformance(): Promise<CheckResult> {
  const id = 'perf_scroll';
  try {
    const passiveSupported = (() => {
      let supported = false;
      try {
        const opts = Object.defineProperty({}, 'passive', { get() { supported = true; return true; } });
        window.addEventListener('testPassive', null as unknown as EventListener, opts);
        window.removeEventListener('testPassive', null as unknown as EventListener, opts);
      } catch { /* تجاهل */ }
      return supported;
    })();
    return { id, label: 'أداء التمرير (Passive Events)', status: passiveSupported ? 'pass' : 'warn', detail: passiveSupported ? 'مدعوم' : 'غير مدعوم — قد يؤثر على الأداء' };
  } catch {
    return { id, label: 'أداء التمرير', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkDomNodesCount(): Promise<CheckResult> {
  const id = 'perf_dom';
  const count = document.querySelectorAll('*').length;
  const status: CheckStatus = count > 3000 ? 'warn' : count > 5000 ? 'fail' : 'pass';
  return { id, label: 'عدد عناصر DOM', status, detail: `${count} عنصر` };
}

export async function checkDeviceMemory(): Promise<CheckResult> {
  const id = 'perf_memory';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (navigator as any).deviceMemory;
  if (!mem) return { id, label: 'ذاكرة الجهاز', status: 'info', detail: 'غير متاح في هذا المتصفح' };
  return { id, label: 'ذاكرة الجهاز', status: mem < 4 ? 'warn' : 'pass', detail: `${mem} GB` };
}

export async function checkWebAssembly(): Promise<CheckResult> {
  const id = 'perf_wasm';
  const supported = typeof WebAssembly !== 'undefined';
  return { id, label: 'WebAssembly', status: supported ? 'pass' : 'info', detail: supported ? 'مدعوم' : 'غير مدعوم' };
}

export async function checkPagePerformance(): Promise<CheckResult> {
  const id = 'perf_pages';
  const summaries = getPagePerfSummaries();
  if (summaries.length === 0) return { id, label: 'أداء الصفحات', status: 'info', detail: 'لا توجد بيانات بعد' };
  const slowPages = summaries.filter(s => s.avgMs > 2000);
  if (slowPages.length > 0) {
    return { id, label: 'أداء الصفحات', status: 'warn', detail: `${slowPages.length} صفحة بطيئة (>${'2s'}): ${slowPages.map(s => s.label).join('، ')}` };
  }
  return { id, label: 'أداء الصفحات', status: 'pass', detail: `${summaries.length} صفحة مُسجّلة — الأبطأ: ${summaries[0]?.label} (${summaries[0]?.avgMs}ms)` };
}

export async function checkWcagContrast(): Promise<CheckResult> {
  const id = 'perf_contrast';
  try {
    const root = document.documentElement;
    const bg = getComputedStyle(root).getPropertyValue('--background').trim();
    const fg = getComputedStyle(root).getPropertyValue('--foreground').trim();
    if (!bg || !fg) return { id, label: 'تباين الألوان (WCAG)', status: 'warn', detail: 'تعذر قراءة متغيرات CSS' };
    return { id, label: 'تباين الألوان (WCAG)', status: 'info', detail: `خلفية: ${bg} | نص: ${fg}` };
  } catch {
    return { id, label: 'تباين الألوان (WCAG)', status: 'info', detail: 'تعذر الفحص' };
  }
}

// ════════════════════════════════════════════════
// بطاقة 3 — التخزين (6)
// ════════════════════════════════════════════════

export async function checkLocalStorage(): Promise<CheckResult> {
  const id = 'storage_local';
  try {
    const keys = Object.keys(localStorage);
    const totalBytes = keys.reduce((sum, k) => sum + (localStorage.getItem(k)?.length ?? 0), 0);
    const kb = Math.round(totalBytes / 1024);
    return { id, label: 'localStorage', status: kb > 4000 ? 'warn' : 'pass', detail: `${keys.length} مفتاح — ${kb} KB` };
  } catch {
    return { id, label: 'localStorage', status: 'fail', detail: 'غير متاح' };
  }
}

export async function checkSessionStorage(): Promise<CheckResult> {
  const id = 'storage_session';
  try {
    const keys = Object.keys(sessionStorage);
    return { id, label: 'sessionStorage', status: 'pass', detail: `${keys.length} مفتاح` };
  } catch {
    return { id, label: 'sessionStorage', status: 'fail', detail: 'غير متاح' };
  }
}

export async function checkIndexedDB(): Promise<CheckResult> {
  const id = 'storage_idb';
  try {
    const dbs = await indexedDB.databases();
    return { id, label: 'IndexedDB', status: 'pass', detail: `${dbs.length} قاعدة بيانات` };
  } catch {
    return { id, label: 'IndexedDB', status: 'info', detail: 'غير متاح أو محظور' };
  }
}

export async function checkServiceWorker(): Promise<CheckResult> {
  const id = 'storage_sw';
  if (!('serviceWorker' in navigator)) return { id, label: 'Service Worker', status: 'info', detail: 'غير مدعوم' };
  const regs = await navigator.serviceWorker.getRegistrations();
  return { id, label: 'Service Worker', status: regs.length > 0 ? 'pass' : 'info', detail: `${regs.length} مسجّل` };
}

export async function checkErrorLogQueue(): Promise<CheckResult> {
  const id = 'storage_errorlog';
  try {
    const raw = localStorage.getItem('error_log_queue');
    if (!raw) return { id, label: 'طابور الأخطاء', status: 'pass', detail: 'فارغ — لا أخطاء معلّقة' };
    let queue = JSON.parse(raw);
    if (!Array.isArray(queue)) queue = [];

    // تنظيف تلقائي: حذف السجلات الأقدم من 24 ساعة + أخطاء اختبارات الوحدة
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = queue.filter((entry: { logged_at?: string; error_message?: string; timestamp?: string }) => {
      const ts = entry.logged_at || entry.timestamp;
      if (ts && new Date(ts).getTime() < cutoff) return false;
      if (entry.error_message === 'Test explosion') return false;
      return true;
    });

    // حفظ القائمة المنظّفة
    if (filtered.length !== queue.length) {
      localStorage.setItem('error_log_queue', JSON.stringify(filtered));
    }

    const count = filtered.length;
    return { id, label: 'طابور الأخطاء', status: count > 0 ? 'warn' : 'pass', detail: count > 0 ? `${count} خطأ معلّق` : 'فارغ — لا أخطاء معلّقة' };
  } catch {
    return { id, label: 'طابور الأخطاء', status: 'info', detail: 'تعذر القراءة' };
  }
}

export async function checkStorageIntegrity(): Promise<CheckResult> {
  const id = 'storage_integrity';
  try {
    const testKey = '__diag_test__';
    localStorage.setItem(testKey, '1');
    const val = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    return { id, label: 'سلامة التخزين', status: val === '1' ? 'pass' : 'fail', detail: val === '1' ? 'القراءة/الكتابة تعمل' : 'فشل التحقق' };
  } catch {
    return { id, label: 'سلامة التخزين', status: 'fail', detail: 'تعذر الكتابة' };
  }
}

// ════════════════════════════════════════════════
// بطاقة 4 — الواجهة والتصميم (3)
// ════════════════════════════════════════════════

export async function checkCssVariables(): Promise<CheckResult> {
  const id = 'ui_css';
  const required = ['--background', '--foreground', '--primary', '--secondary', '--muted', '--accent'];
  const root = getComputedStyle(document.documentElement);
  const missing = required.filter(v => !root.getPropertyValue(v).trim());
  if (missing.length > 0) return { id, label: 'متغيرات CSS', status: 'fail', detail: `مفقودة: ${missing.join('، ')}` };
  return { id, label: 'متغيرات CSS', status: 'pass', detail: `${required.length} متغير أساسي موجود` };
}

export async function checkFontsLoaded(): Promise<CheckResult> {
  const id = 'ui_fonts';
  try {
    const fonts = await document.fonts.ready;
    const loadedFamilies = new Set<string>();
    fonts.forEach(f => loadedFamilies.add(f.family));
    const hasTajawal = loadedFamilies.has('Tajawal');
    const hasAmiri = loadedFamilies.has('Amiri');
    if (!hasTajawal && !hasAmiri) return { id, label: 'الخطوط', status: 'warn', detail: 'Tajawal و Amiri غير محمّلين' };
    if (!hasTajawal || !hasAmiri) return { id, label: 'الخطوط', status: 'warn', detail: `مفقود: ${!hasTajawal ? 'Tajawal' : 'Amiri'}` };
    return { id, label: 'الخطوط', status: 'pass', detail: `Tajawal + Amiri محمّلان (${loadedFamilies.size} عائلة)` };
  } catch {
    return { id, label: 'الخطوط', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkCSP(): Promise<CheckResult> {
  const id = 'ui_csp';
  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  return { id, label: 'Content Security Policy', status: meta ? 'pass' : 'info', detail: meta ? 'موجود في meta tag' : 'غير مضبوط عبر meta — قد يكون عبر header' };
}

// ════════════════════════════════════════════════
// بطاقة 5 — الأمان والصلاحيات (4)
// ════════════════════════════════════════════════

export async function checkCryptoAPI(): Promise<CheckResult> {
  const id = 'sec_crypto';
  const supported = typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
  return { id, label: 'Web Crypto API', status: supported ? 'pass' : 'warn', detail: supported ? 'مدعوم' : 'غير مدعوم — قد يؤثر على التشفير' };
}

export async function checkNotificationPermission(): Promise<CheckResult> {
  const id = 'sec_notification';
  if (!('Notification' in window)) return { id, label: 'إذن الإشعارات', status: 'info', detail: 'غير مدعوم' };
  return { id, label: 'إذن الإشعارات', status: Notification.permission === 'granted' ? 'pass' : 'info', detail: `الحالة: ${Notification.permission}` };
}

export async function checkClipboardAPI(): Promise<CheckResult> {
  const id = 'sec_clipboard';
  const supported = navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
  return { id, label: 'Clipboard API', status: supported ? 'pass' : 'info', detail: supported ? 'مدعوم' : 'غير مدعوم' };
}

export async function checkWindowOnError(): Promise<CheckResult> {
  const id = 'sec_onerror';
  const hasHandler = typeof window.onerror === 'function';
  return { id, label: 'معالج الأخطاء العام', status: 'info', detail: hasHandler ? 'window.onerror مضبوط' : 'لا يوجد window.onerror — ErrorBoundary يكفي' };
}

// ════════════════════════════════════════════════
// بطاقة 6 — إعدادات التطبيق (3)
// ════════════════════════════════════════════════

export async function checkEnvVariables(): Promise<CheckResult> {
  const id = 'app_env';
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { id, label: 'متغيرات البيئة', status: 'fail', detail: 'مفقودة: VITE_SUPABASE_URL أو PUBLISHABLE_KEY' };
  return { id, label: 'متغيرات البيئة', status: 'pass', detail: 'SUPABASE_URL و PUBLISHABLE_KEY موجودان' };
}

export async function checkRegisteredRoutes(): Promise<CheckResult> {
  const id = 'app_routes';
  // مقارنة الروابط المسجّلة في القوائم مع ROUTE_TITLES
  const allLinks = [...allAdminLinks, ...allBeneficiaryLinks];
  const missing = allLinks
    .map(l => l.to)
    .filter(path => !ROUTE_TITLES[path]);

  if (missing.length > 0) {
    return { id, label: 'تطابق المسارات', status: 'warn', detail: `${missing.length} مسار بدون عنوان: ${missing.slice(0, 3).join('، ')}` };
  }
  return { id, label: 'تطابق المسارات', status: 'pass', detail: `${allLinks.length} رابط مسجّل — الكل متطابق مع ROUTE_TITLES` };
}

export async function checkOnlineStatus(): Promise<CheckResult> {
  const id = 'app_online';
  return { id, label: 'حالة الاتصال', status: navigator.onLine ? 'pass' : 'warn', detail: navigator.onLine ? 'متصل بالإنترنت' : 'غير متصل' };
}

// ════════════════════════════════════════════════
// مجمّع — تشغيل كل الفحوصات
// ════════════════════════════════════════════════

export interface DiagnosticCategory {
  title: string;
  checks: (() => Promise<CheckResult>)[];
}

export const diagnosticCategories: DiagnosticCategory[] = [
  {
    title: 'قاعدة البيانات',
    checks: [checkSupabaseConnection, checkRealtimeChannels, checkAuthSession],
  },
  {
    title: 'المتصفح والأداء',
    checks: [checkNavigatorLocks, checkScrollPerformance, checkDomNodesCount, checkDeviceMemory, checkWebAssembly, checkPagePerformance, checkWcagContrast],
  },
  {
    title: 'التخزين',
    checks: [checkLocalStorage, checkSessionStorage, checkIndexedDB, checkServiceWorker, checkErrorLogQueue, checkStorageIntegrity],
  },
  {
    title: 'الواجهة والتصميم',
    checks: [checkCssVariables, checkFontsLoaded, checkCSP],
  },
  {
    title: 'الأمان والصلاحيات',
    checks: [checkCryptoAPI, checkNotificationPermission, checkClipboardAPI, checkWindowOnError],
  },
  {
    title: 'إعدادات التطبيق',
    checks: [checkEnvVariables, checkRegisteredRoutes, checkOnlineStatus],
  },
];

export async function runAllDiagnostics(): Promise<{ category: string; results: CheckResult[] }[]> {
  const output: { category: string; results: CheckResult[] }[] = [];
  for (const cat of diagnosticCategories) {
    const results = await Promise.all(cat.checks.map(fn => fn()));
    output.push({ category: cat.title, results });
  }
  return output;
}
