/**
 * Barrel — تجميع الفحوصات التشخيصية والمُشغّلات.
 * تم تقسيم المحتوى إلى registry.ts (السجل) و runners.ts (المُشغّلات) للالتزام بحدّ ≤200 سطر/ملف.
 */

// الأنواع المشتركة
export type { CheckStatus, CheckResult, DiagnosticCategory } from './types';

// السجل (categories + light titles)
export { diagnosticCategories, LIGHT_CATEGORY_TITLES } from './registry';

// المُشغّلات
export type { RunAuditOptions } from './runners';
export { runAllDiagnostics, runLightDiagnostics, runCategoryDiagnostics, runByIds } from './runners';

// إعادة تصدير دوال الفحوصات (للتوافق مع المستوردين الحاليين)
export { checkSupabaseConnection, checkRealtimeChannels, checkAuthSession } from './checks/database';
export { checkScrollPerformance, checkDomNodesCount, checkDeviceMemory, checkPagePerformance, checkWcagContrast } from './checks/performance';
export { checkLocalStorage, checkSessionStorage, checkIndexedDB, checkServiceWorker, checkErrorLogQueue, checkStorageIntegrity } from './checks/storage';
export { checkCssVariables, checkFontsLoaded, checkCSP } from './checks/ui';
export { checkNotificationPermission, checkClipboardAPI } from './checks/security';
export { checkEnvVariables, checkRegisteredRoutes, checkOnlineStatus } from './checks/appSettings';
export { checkZatcaCertificateValidity, checkInvoiceChainIntegrity, checkPendingInvoiceChains, checkUnsubmittedInvoices, checkZatcaSettings, checkStaleOtp, checkInvoiceChainCompleteness } from './checks/zatca';
export { checkPartiallyPaidConsistency, checkDistributionsVsAvailable, checkBeneficiariesWithoutAccount, checkContractsWithoutAllocations, checkOverduePartiallyPaid } from './checks/financial';
export { checkAvailableAmountNonNegative, checkDistributionsWithinAvailable, checkBeneficiaryShareFormula, checkAdvancesWithinShare, checkOverduePendingNoOverlap, checkCarryforwardIntegrity } from './checks/cardConsistency';
export { checkDbVsRpcTotalIncome, checkDbVsRpcExpenses, checkRpcVsUiAvailableAmount, checkSnapshotIntegrityClosedYear } from './checks/numericalAudit';
export { checkRoutesRegistryConsistency, checkCurrentRouteResolved, checkNoBrokenChunkRetries } from './checks/routing';
export { checkAuditModeFlag, checkAuditRealtimeDisabled, checkAuditSwBlocked, checkAuditQueryClientElevated, checkPdfChunksDeferred } from './checks/auditMode';
export { checkSwRefusalReason, checkManifestPresent, checkSwActiveRegistration } from './checks/pwa';
export { checkRuntimeErrorsLog } from './checks/runtimeErrors';
export { checkAppMapPagesReachable, checkAppMapOrphanPages, checkAppMapMissingTitles, checkAppMapRoleCoverage, checkAppMapRouteRoleSync } from './checks/appMap';
export { checkInteractionsTabsInventory, checkInteractionsHandlerLess, checkInteractionsDuplicateTabs, checkInteractionsMissingAria } from './checks/interactions';
export { checkConvFileSize, checkConvNoConsole, checkConvNoHexColors, checkConvRtlHtmlDir, checkConvFiscalYearStorage } from './checks/conventions';
export { checkBackendEdgeHealthPing, checkBackendEdgeInventory, checkBackendAuthSession, checkBackendRoleResolved, checkBackendFiscalYearActive, checkBackendStorageBuckets } from './checks/backend';
