/**
 * تصدير مركزي — hooks/financial/
 * Business logic فقط — لا استدعاءات Supabase مباشرة
 */

// الحسابات الختامية
export { useAccountsActions } from './useAccountsActions';
export { useAccountsCalculations } from './useAccountsCalculations';
export { useAccountsData } from './useAccountsData';
export { useAccountsEditing } from './useAccountsEditing';
export { useAccountsPage } from './useAccountsPage';
export { useAccountsSettings } from './useAccountsSettings';

// الحسابات المحسوبة
export { useComputedFinancials } from './useComputedFinancials';
export { useRawFinancialData } from './useRawFinancialData';
export { useFinancialSummary } from './useFinancialSummary';

// حصة المستفيد
export { useMyShare } from './useMyShare';

// تخصيص العقود
export { useContractAllocationMap } from './useContractAllocationMap';

// العقارات المالية
export { computePropertyFinancials } from './usePropertyFinancials';
export type { PropertyFinancials } from './usePropertyFinancials';
export { usePropertyPerformance } from './usePropertyPerformance';
export type { PropertyPerformanceItem, PropertyPerformanceTotals } from './usePropertyPerformance';
