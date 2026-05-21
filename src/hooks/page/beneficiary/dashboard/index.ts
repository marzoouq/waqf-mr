/**
 * Sub-barrel: dashboard hooks (beneficiary scope)
 * #M6 — `useEndUserFinancials` و`useEndUserDashboardData` انتقلا إلى
 * `@/hooks/application/dashboard/` (طبقة مشتركة بين الأدوار).
 * إعادة تصدير `useWaqifDashboardPage` حُذفت لأنها لم تكن مستخدمة.
 */
export { useBeneficiaryDashboardPage } from './useBeneficiaryDashboardPage';
