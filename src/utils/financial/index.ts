/**
 * Barrel file — دوال مالية
 */
export { calculateFinancials, groupIncomeBySource, groupExpensesByType, computeTotals, type FinancialParams, type FinancialResult } from './accountsCalculations';
export { allocateContractToFiscalYears, getContractSpanInfo, generatePaymentDueDates, type FiscalAllocation } from './contractAllocation';
export * from './contractHelpers';
export { findAccountByFY } from './findAccountByFY';
export { computeMonthlyData, computeCollectionSummary, computeOccupancy, type MonthlyDataPoint, type CollectionSummaryResult, type OccupancyResult } from './dashboardComputations';
export { calcChangePercent } from './calcChangePercent';
export { activeYearFinancials } from './activeYearFinancials';
export type { ActiveYearParams } from './activeYearFinancials';
export { closedYearFinancials } from './closedYearFinancials';
export type { ClosedYearParams } from './closedYearFinancials';
export { calculateDistributions } from './distributionCalcPure';
export type { DistributionRow } from './distributionCalcPure';
