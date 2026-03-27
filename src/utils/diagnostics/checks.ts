/**
 * 31 فحصاً تشخيصياً للنظام — مقسّمة على 7 بطاقات
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
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
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
// بطاقة 7 — ZATCA وسلسلة الفواتير (5)
// ════════════════════════════════════════════════

export async function checkZatcaCertificateValidity(): Promise<CheckResult> {
  const id = 'zatca_cert';
  try {
    const { data, error } = await supabase
      .from('zatca_certificates')
      .select('certificate_type, is_active, expires_at')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error) return { id, label: 'شهادة ZATCA', status: 'fail', detail: `خطأ: ${error.message}` };
    if (!data) return { id, label: 'شهادة ZATCA', status: 'warn', detail: 'لا توجد شهادة نشطة — يجب إجراء عملية الربط (Onboard)' };

    const certType = data.certificate_type || 'غير محدد';
    if (!data.expires_at) {
      return { id, label: 'شهادة ZATCA', status: 'info', detail: `نوع: ${certType} — تاريخ الانتهاء غير محدد` };
    }

    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return { id, label: 'شهادة ZATCA', status: 'fail', detail: `نوع: ${certType} — منتهية منذ ${Math.abs(daysLeft)} يوم! يجب التجديد فوراً` };
    }
    if (daysLeft <= 14) {
      return { id, label: 'شهادة ZATCA', status: 'warn', detail: `نوع: ${certType} — تنتهي خلال ${daysLeft} يوم — يُنصح بالتجديد` };
    }
    return { id, label: 'شهادة ZATCA', status: 'pass', detail: `نوع: ${certType} — صالحة لمدة ${daysLeft} يوم` };
  } catch {
    return { id, label: 'شهادة ZATCA', status: 'fail', detail: 'تعذر الفحص — قد لا تملك صلاحية الوصول' };
  }
}

export async function checkInvoiceChainIntegrity(): Promise<CheckResult> {
  const id = 'zatca_chain';
  try {
    const { data: chainRecords, error } = await supabase
      .from('invoice_chain')
      .select('icv, invoice_hash, previous_hash')
      .neq('invoice_hash', 'PENDING')
      .order('icv', { ascending: true })
      .limit(500);

    if (error) return { id, label: 'تكامل سلسلة الفواتير', status: 'fail', detail: `خطأ: ${error.message}` };
    if (!chainRecords || chainRecords.length === 0) {
      return { id, label: 'تكامل سلسلة الفواتير', status: 'info', detail: 'لا توجد سجلات في السلسلة بعد' };
    }

    // فحص تسلسل ICV — يجب أن يكون متزايداً بدون فجوات
    let brokenLinks = 0;
    let icvGaps = 0;
    for (let i = 1; i < chainRecords.length; i++) {
      const prev = chainRecords[i - 1]!;
      const curr = chainRecords[i]!;
      if (curr.previous_hash !== prev.invoice_hash) {
        brokenLinks++;
      }
      if (curr.icv !== prev.icv + 1) {
        icvGaps++;
      }
    }

    const total = chainRecords.length;
    if (brokenLinks > 0) {
      return { id, label: 'تكامل سلسلة الفواتير', status: 'fail', detail: `${total} سجل — ${brokenLinks} رابط مكسور في سلسلة PIH!` };
    }
    if (icvGaps > 0) {
      return { id, label: 'تكامل سلسلة الفواتير', status: 'warn', detail: `${total} سجل — ${icvGaps} فجوة في تسلسل ICV` };
    }
    return { id, label: 'تكامل سلسلة الفواتير', status: 'pass', detail: `${total} سجل — السلسلة متكاملة (ICV ${chainRecords[0]?.icv ?? '?'}–${chainRecords[total - 1]?.icv ?? '?'})` };
  } catch {
    return { id, label: 'تكامل سلسلة الفواتير', status: 'fail', detail: 'تعذر الفحص' };
  }
}

export async function checkPendingInvoiceChains(): Promise<CheckResult> {
  const id = 'zatca_pending';
  try {
    const { count, error } = await supabase
      .from('invoice_chain')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_hash', 'PENDING');

    if (error) return { id, label: 'سجلات PENDING في السلسلة', status: 'fail', detail: `خطأ: ${error.message}` };
    const pendingCount = count ?? 0;
    if (pendingCount > 0) {
      return { id, label: 'سجلات PENDING في السلسلة', status: 'warn', detail: `${pendingCount} سجل بحالة PENDING — قد تحتاج تنظيف` };
    }
    return { id, label: 'سجلات PENDING في السلسلة', status: 'pass', detail: 'لا توجد سجلات معلّقة' };
  } catch {
    return { id, label: 'سجلات PENDING في السلسلة', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkUnsubmittedInvoices(): Promise<CheckResult> {
  const id = 'zatca_unsubmitted';
  try {
    const { count, error } = await supabase
      .from('payment_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .eq('zatca_status', 'not_submitted');

    if (error) return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'fail', detail: `خطأ: ${error.message}` };
    const unsubCount = count ?? 0;
    if (unsubCount > 10) {
      return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'warn', detail: `${unsubCount} فاتورة مدفوعة لم تُبلّغ لـ ZATCA` };
    }
    if (unsubCount > 0) {
      return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'info', detail: `${unsubCount} فاتورة بانتظار التبليغ` };
    }
    return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'pass', detail: 'كل الفواتير المدفوعة مُبلّغة' };
  } catch {
    return { id, label: 'فواتير مدفوعة غير مُبلّغة', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkZatcaSettings(): Promise<CheckResult> {
  const id = 'zatca_settings';
  try {
    const requiredKeys = ['vat_registration_number', 'waqf_name', 'commercial_registration_number'];
    const { data, error } = await supabase
      .from('app_settings')
      .select('key')
      .in('key', requiredKeys);

    if (error) return { id, label: 'إعدادات ZATCA الأساسية', status: 'fail', detail: `خطأ: ${error.message}` };
    const foundKeys = (data || []).map(r => r.key);
    const missing = requiredKeys.filter(k => !foundKeys.includes(k));

    if (missing.length > 0) {
      const labels: Record<string, string> = {
        vat_registration_number: 'الرقم الضريبي',
        waqf_name: 'اسم الوقف',
        commercial_registration_number: 'السجل التجاري',
      };
      return { id, label: 'إعدادات ZATCA الأساسية', status: 'fail', detail: `مفقودة: ${missing.map(k => labels[k] || k).join('، ')}` };
    }
    return { id, label: 'إعدادات ZATCA الأساسية', status: 'pass', detail: 'الرقم الضريبي + اسم الوقف + السجل التجاري — موجودة' };
  } catch {
    return { id, label: 'إعدادات ZATCA الأساسية', status: 'info', detail: 'تعذر الفحص' };
  }
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
  {
    title: 'ZATCA والفوترة الإلكترونية',
    checks: [checkZatcaCertificateValidity, checkInvoiceChainIntegrity, checkPendingInvoiceChains, checkUnsubmittedInvoices, checkZatcaSettings],
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
