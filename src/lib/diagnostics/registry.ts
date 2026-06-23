/**
 * سجل فئات التشخيص — تم استخراجه من checks.ts للالتزام بحدّ ≤200 سطر/ملف
 */
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
import type { DiagnosticCategory } from './types';

export const diagnosticCategories: DiagnosticCategory[] = [
  { title: 'قاعدة البيانات', checks: [checkSupabaseConnection, checkRealtimeChannels, checkAuthSession] },
  { title: 'المتصفح والأداء', checks: [checkScrollPerformance, checkDomNodesCount, checkDeviceMemory, checkPagePerformance, checkWcagContrast] },
  { title: 'التخزين', checks: [checkLocalStorage, checkSessionStorage, checkIndexedDB, checkServiceWorker, checkErrorLogQueue, checkStorageIntegrity] },
  { title: 'الواجهة والتصميم', checks: [checkCssVariables, checkFontsLoaded, checkCSP] },
  { title: 'الأمان والصلاحيات', checks: [checkNotificationPermission, checkClipboardAPI] },
  { title: 'إعدادات التطبيق', checks: [checkEnvVariables, checkRegisteredRoutes, checkOnlineStatus] },
  { title: 'ZATCA والفوترة الإلكترونية', checks: [checkZatcaCertificateValidity, checkInvoiceChainIntegrity, checkPendingInvoiceChains, checkUnsubmittedInvoices, checkZatcaSettings, checkStaleOtp, checkInvoiceChainCompleteness] },
  { title: 'الفحوصات المالية', checks: [checkPartiallyPaidConsistency, checkDistributionsVsAvailable, checkBeneficiariesWithoutAccount, checkContractsWithoutAllocations, checkOverduePartiallyPaid] },
  { title: 'اتساق بطاقات اللوحات', checks: [checkAvailableAmountNonNegative, checkDistributionsWithinAvailable, checkBeneficiaryShareFormula, checkAdvancesWithinShare, checkOverduePendingNoOverlap, checkCarryforwardIntegrity] },
  { title: 'تدقيق رقمي DB ↔ RPC ↔ UI', checks: [checkDbVsRpcTotalIncome, checkDbVsRpcExpenses, checkRpcVsUiAvailableAmount, checkSnapshotIntegrityClosedYear] },
  { title: 'التوجيه والمسارات', checks: [checkRoutesRegistryConsistency, checkCurrentRouteResolved, checkNoBrokenChunkRetries] },
  { title: 'وضع التدقيق (Lighthouse)', checks: [checkAuditModeFlag, checkAuditRealtimeDisabled, checkAuditSwBlocked, checkAuditQueryClientElevated, checkPdfChunksDeferred] },
  { title: 'PWA و Service Worker', checks: [checkSwRefusalReason, checkManifestPresent, checkSwActiveRegistration] },
  { title: 'أخطاء التشغيل', checks: [checkRuntimeErrorsLog] },
  { title: 'خريطة التطبيق', checks: [checkAppMapPagesReachable, checkAppMapOrphanPages, checkAppMapMissingTitles, checkAppMapRoleCoverage, checkAppMapRouteRoleSync] },
  { title: 'تفاعلات الواجهة', checks: [checkInteractionsTabsInventory, checkInteractionsHandlerLess, checkInteractionsDuplicateTabs, checkInteractionsMissingAria] },
  { title: 'اتفاقيات الكود', checks: [checkConvFileSize, checkConvNoConsole, checkConvNoHexColors, checkConvRtlHtmlDir, checkConvFiscalYearStorage] },
  { title: 'Backend & Edge', checks: [checkBackendEdgeHealthPing, checkBackendEdgeInventory, checkBackendAuthSession, checkBackendRoleResolved, checkBackendFiscalYearActive, checkBackendStorageBuckets] },
];

/**
 * F4: قائمة البطاقات «الخفيفة» — لا تتصل بـ Supabase/DB ولا بـ Edge Functions.
 */
export const LIGHT_CATEGORY_TITLES = new Set<string>([
  'المتصفح والأداء',
  'التخزين',
  'الواجهة والتصميم',
  'الأمان والصلاحيات',
  'إعدادات التطبيق',
  'التوجيه والمسارات',
  'وضع التدقيق (Lighthouse)',
  'PWA و Service Worker',
  'أخطاء التشغيل',
  'تفاعلات الواجهة',
  'اتفاقيات الكود',
]);
