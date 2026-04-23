/**
 * Barrel — components/reports
 *
 * مكونات تقارير خفيفة فقط (جداول، بطاقات، مؤشرات).
 * المكونات الثقيلة (recharts/pdf) مُستبعدة عمداً ويجب استيرادها
 * مباشرة عبر default import أو lazy() داخل الصفحة المستخدمة لها فقط.
 *
 * المُستبعدة:
 *   - CashFlowReport, CashFlowChartInner, CashFlowTable
 *   - MonthlyPerformanceReport, MonthlyPerformanceChartsInner
 *   - ReportsChartsInner
 *   - HistoricalComparisonChartInner
 *   - YoYChartsSection, YoYChartsSectionInner
 *   - YearOverYearComparison
 */
export { default as AnnualDisclosureTable } from './AnnualDisclosureTable';
export { default as BalanceSheetReport } from './BalanceSheetReport';
export { default as BeneficiaryDistributionTable } from './BeneficiaryDistributionTable';
export { default as OverdueTenantsReport } from './OverdueTenantsReport';
export { default as PropertyPerformanceTable } from './PropertyPerformanceTable';
export { default as YoYComparisonTable } from './YoYComparisonTable';
export { default as ZakatEstimationReport } from './ZakatEstimationReport';
export { ChangeIndicator } from './ChangeIndicator';
