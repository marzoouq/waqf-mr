/**
 * 30 فحصاً تشخيصياً للنظام — مقسّمة على 7 بطاقات
 * تم تنظيفها (الموجة 12): حذف 3 فحوصات بلا قيمة (NavigatorLocks, WebAssembly, CryptoAPI, WindowOnError)
 */

// الأنواع المشتركة
export type { CheckStatus, CheckResult, DiagnosticCategory } from './types';

// بطاقة 1 — قاعدة البيانات
export { checkSupabaseConnection, checkRealtimeChannels, checkAuthSession } from './checks/database';

// بطاقة 2 — المتصفح والأداء
export { checkScrollPerformance, checkDomNodesCount, checkDeviceMemory, checkPagePerformance, checkWcagContrast } from './checks/performance';

// بطاقة 3 — التخزين
export { checkLocalStorage, checkSessionStorage, checkIndexedDB, checkServiceWorker, checkErrorLogQueue, checkStorageIntegrity } from './checks/storage';

// بطاقة 4 — الواجهة والتصميم
export { checkCssVariables, checkFontsLoaded, checkCSP } from './checks/ui';

// بطاقة 5 — الأمان والصلاحيات
export { checkNotificationPermission, checkClipboardAPI } from './checks/security';

// بطاقة 6 — إعدادات التطبيق
export { checkEnvVariables, checkRegisteredRoutes, checkOnlineStatus } from './checks/appSettings';

// بطاقة 7 — ZATCA والفوترة الإلكترونية
export { checkZatcaCertificateValidity, checkInvoiceChainIntegrity, checkPendingInvoiceChains, checkUnsubmittedInvoices, checkZatcaSettings, checkStaleOtp, checkInvoiceChainCompleteness } from './checks/zatca';

// استيراد الدوال لبناء المجمّع
import { checkSupabaseConnection, checkRealtimeChannels, checkAuthSession } from './checks/database';
import { checkScrollPerformance, checkDomNodesCount, checkDeviceMemory, checkPagePerformance, checkWcagContrast } from './checks/performance';
import { checkLocalStorage, checkSessionStorage, checkIndexedDB, checkServiceWorker, checkErrorLogQueue, checkStorageIntegrity } from './checks/storage';
import { checkCssVariables, checkFontsLoaded, checkCSP } from './checks/ui';
import { checkNotificationPermission, checkClipboardAPI } from './checks/security';
import { checkEnvVariables, checkRegisteredRoutes, checkOnlineStatus } from './checks/appSettings';
import { checkZatcaCertificateValidity, checkInvoiceChainIntegrity, checkPendingInvoiceChains, checkUnsubmittedInvoices, checkZatcaSettings, checkStaleOtp, checkInvoiceChainCompleteness } from './checks/zatca';
import type { CheckResult, DiagnosticCategory } from './types';

// ════════════════════════════════════════════════
// مجمّع البطاقات
// ════════════════════════════════════════════════

export const diagnosticCategories: DiagnosticCategory[] = [
  {
    title: 'قاعدة البيانات',
    checks: [checkSupabaseConnection, checkRealtimeChannels, checkAuthSession],
  },
  {
    title: 'المتصفح والأداء',
    checks: [checkScrollPerformance, checkDomNodesCount, checkDeviceMemory, checkPagePerformance, checkWcagContrast],
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
    checks: [checkNotificationPermission, checkClipboardAPI],
  },
  {
    title: 'إعدادات التطبيق',
    checks: [checkEnvVariables, checkRegisteredRoutes, checkOnlineStatus],
  },
  {
    title: 'ZATCA والفوترة الإلكترونية',
    checks: [checkZatcaCertificateValidity, checkInvoiceChainIntegrity, checkPendingInvoiceChains, checkUnsubmittedInvoices, checkZatcaSettings, checkStaleOtp, checkInvoiceChainCompleteness],
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

/** تشغيل فحوصات بطاقة واحدة فقط حسب العنوان */
export async function runCategoryDiagnostics(categoryTitle: string): Promise<{ category: string; results: CheckResult[] } | null> {
  const cat = diagnosticCategories.find(c => c.title === categoryTitle);
  if (!cat) return null;
  const results = await Promise.all(cat.checks.map(fn => fn()));
  return { category: cat.title, results };
}
