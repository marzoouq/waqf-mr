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

// بطاقة 8 — فحوصات مالية
export { checkPartiallyPaidConsistency, checkDistributionsVsAvailable, checkBeneficiariesWithoutAccount, checkContractsWithoutAllocations, checkOverduePartiallyPaid } from './checks/financial';

// بطاقة 9 — اتساق بطاقات اللوحات
export { checkAvailableAmountNonNegative, checkDistributionsWithinAvailable, checkBeneficiaryShareFormula, checkAdvancesWithinShare, checkOverduePendingNoOverlap, checkCarryforwardIntegrity } from './checks/cardConsistency';

// بطاقة 10 — تدقيق رقمي DB ↔ RPC ↔ UI
export { checkDbVsRpcTotalIncome, checkDbVsRpcExpenses, checkRpcVsUiAvailableAmount, checkSnapshotIntegrityClosedYear } from './checks/numericalAudit';

// بطاقة 11 — التوجيه
export { checkRoutesRegistryConsistency, checkCurrentRouteResolved, checkNoBrokenChunkRetries } from './checks/routing';

// بطاقة 12 — وضع التدقيق (Lighthouse)
export { checkAuditModeFlag, checkAuditRealtimeDisabled, checkAuditSwBlocked, checkAuditQueryClientElevated, checkPdfChunksDeferred } from './checks/auditMode';

// بطاقة 13 — PWA و Service Worker
export { checkSwRefusalReason, checkManifestPresent, checkSwActiveRegistration } from './checks/pwa';

// بطاقة 14 — أخطاء التشغيل
export { checkRuntimeErrorsLog } from './checks/runtimeErrors';

// بطاقة 15 — خريطة التطبيق
export { checkAppMapPagesReachable, checkAppMapOrphanPages, checkAppMapMissingTitles, checkAppMapRoleCoverage, checkAppMapRouteRoleSync } from './checks/appMap';

// بطاقة 16 — تفاعلات الواجهة
export { checkInteractionsTabsInventory, checkInteractionsHandlerLess, checkInteractionsDuplicateTabs, checkInteractionsMissingAria } from './checks/interactions';

// بطاقة 17 — اتفاقيات الكود
export { checkConvFileSize, checkConvNoConsole, checkConvNoHexColors, checkConvRtlHtmlDir, checkConvFiscalYearStorage } from './checks/conventions';

// بطاقة 18 — Backend & Edge
export { checkBackendEdgeHealthPing, checkBackendEdgeInventory, checkBackendAuthSession, checkBackendRoleResolved, checkBackendFiscalYearActive, checkBackendStorageBuckets } from './checks/backend';

// استيراد الدوال لبناء المجمّع
import { checkSupabaseConnection, checkRealtimeChannels, checkAuthSession } from './checks/database';
import { checkScrollPerformance, checkDomNodesCount, checkDeviceMemory, checkPagePerformance, checkWcagContrast } from './checks/performance';
import { checkLocalStorage, checkSessionStorage, checkIndexedDB, checkServiceWorker, checkErrorLogQueue, checkStorageIntegrity } from './checks/storage';
import { checkCssVariables, checkFontsLoaded, checkCSP } from './checks/ui';
import { checkNotificationPermission, checkClipboardAPI } from './checks/security';
import { checkEnvVariables, checkRegisteredRoutes, checkOnlineStatus } from './checks/appSettings';
import { checkZatcaCertificateValidity, checkInvoiceChainIntegrity, checkPendingInvoiceChains, checkUnsubmittedInvoices, checkZatcaSettings, checkStaleOtp, checkInvoiceChainCompleteness } from './checks/zatca';
import { checkPartiallyPaidConsistency, checkDistributionsVsAvailable, checkBeneficiariesWithoutAccount, checkContractsWithoutAllocations, checkOverduePartiallyPaid } from './checks/financial';
import { checkAvailableAmountNonNegative, checkDistributionsWithinAvailable, checkBeneficiaryShareFormula, checkAdvancesWithinShare, checkOverduePendingNoOverlap, checkCarryforwardIntegrity } from './checks/cardConsistency';
import { checkDbVsRpcTotalIncome, checkDbVsRpcExpenses, checkRpcVsUiAvailableAmount, checkSnapshotIntegrityClosedYear } from './checks/numericalAudit';
import { checkRoutesRegistryConsistency, checkCurrentRouteResolved, checkNoBrokenChunkRetries } from './checks/routing';
import { checkAuditModeFlag, checkAuditRealtimeDisabled, checkAuditSwBlocked, checkAuditQueryClientElevated, checkPdfChunksDeferred } from './checks/auditMode';
import { checkSwRefusalReason, checkManifestPresent, checkSwActiveRegistration } from './checks/pwa';
import { checkRuntimeErrorsLog } from './checks/runtimeErrors';
import { checkAppMapPagesReachable, checkAppMapOrphanPages, checkAppMapMissingTitles, checkAppMapRoleCoverage, checkAppMapRouteRoleSync } from './checks/appMap';
import { checkInteractionsTabsInventory, checkInteractionsHandlerLess, checkInteractionsDuplicateTabs, checkInteractionsMissingAria } from './checks/interactions';
import { checkConvFileSize, checkConvNoConsole, checkConvNoHexColors, checkConvRtlHtmlDir, checkConvFiscalYearStorage } from './checks/conventions';
import { checkBackendEdgeHealthPing, checkBackendEdgeInventory, checkBackendAuthSession, checkBackendRoleResolved, checkBackendFiscalYearActive, checkBackendStorageBuckets } from './checks/backend';
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
  {
    title: 'الفحوصات المالية',
    checks: [checkPartiallyPaidConsistency, checkDistributionsVsAvailable, checkBeneficiariesWithoutAccount, checkContractsWithoutAllocations, checkOverduePartiallyPaid],
  },
  {
    title: 'اتساق بطاقات اللوحات',
    checks: [checkAvailableAmountNonNegative, checkDistributionsWithinAvailable, checkBeneficiaryShareFormula, checkAdvancesWithinShare, checkOverduePendingNoOverlap, checkCarryforwardIntegrity],
  },
  {
    title: 'تدقيق رقمي DB ↔ RPC ↔ UI',
    checks: [checkDbVsRpcTotalIncome, checkDbVsRpcExpenses, checkRpcVsUiAvailableAmount, checkSnapshotIntegrityClosedYear],
  },
  {
    title: 'التوجيه والمسارات',
    checks: [checkRoutesRegistryConsistency, checkCurrentRouteResolved, checkNoBrokenChunkRetries],
  },
  {
    title: 'وضع التدقيق (Lighthouse)',
    checks: [checkAuditModeFlag, checkAuditRealtimeDisabled, checkAuditSwBlocked, checkAuditQueryClientElevated, checkPdfChunksDeferred],
  },
  {
    title: 'PWA و Service Worker',
    checks: [checkSwRefusalReason, checkManifestPresent, checkSwActiveRegistration],
  },
  {
    title: 'أخطاء التشغيل',
    checks: [checkRuntimeErrorsLog],
  },
  {
    title: 'خريطة التطبيق',
    checks: [checkAppMapPagesReachable, checkAppMapOrphanPages, checkAppMapMissingTitles, checkAppMapRoleCoverage, checkAppMapRouteRoleSync],
  },
  {
    title: 'تفاعلات الواجهة',
    checks: [checkInteractionsTabsInventory, checkInteractionsHandlerLess, checkInteractionsDuplicateTabs, checkInteractionsMissingAria],
  },
  {
    title: 'اتفاقيات الكود',
    checks: [checkConvFileSize, checkConvNoConsole, checkConvNoHexColors, checkConvRtlHtmlDir, checkConvFiscalYearStorage],
  },
  {
    title: 'Backend & Edge',
    checks: [checkBackendEdgeHealthPing, checkBackendEdgeInventory, checkBackendAuthSession, checkBackendRoleResolved, checkBackendFiscalYearActive, checkBackendStorageBuckets],
  },
];

/** خيارات تشغيل الفحص مع دعم progress و cancel. */
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
      const label = `${cat.title}`;
      onProgress?.({ done, total, current: label });
      results.push(await fn());
      done += 1;
      onProgress?.({ done, total, current: label });
    }
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

/**
 * تشغيل فحوصات محدَّدة بـ ids — يستخدمه زر "إعادة الفاشلة فقط".
 * يُعيد نتائج موزَّعة على بطاقاتها لدمجها مع الحالة الحالية.
 */
export async function runByIds(ids: string[]): Promise<{ category: string; results: CheckResult[] }[]> {
  const want = new Set(ids);
  const output: { category: string; results: CheckResult[] }[] = [];
  for (const cat of diagnosticCategories) {
    const matches: (() => Promise<CheckResult>)[] = [];
    // نُشغّل كل فحوصات البطاقة ثم نُرشّح — أبسط من تتبّع id لكل دالة.
    const results = await Promise.all(cat.checks.map(fn => fn()));
    const filtered = results.filter(r => want.has(r.id));
    if (filtered.length) output.push({ category: cat.title, results: filtered });
    void matches;
  }
  return output;
}


