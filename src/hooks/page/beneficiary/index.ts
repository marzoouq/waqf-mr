/**
 * Barrel: تصدير مركزي لهوكات صفحات المستفيد.
 * يعيد التصدير من الملفات مباشرة (وليس من sub-barrels) لتفادي barrel→barrel.
 */
export * from './dashboard/useBeneficiaryDashboardData';
export * from './dashboard/useBeneficiaryDashboardPage';
export * from './dashboard/useBeneficiaryFinancials';

export * from './financial/useAccountsViewPage';
export * from './financial/useCarryforwardData';
export * from './financial/useDisclosurePage';
export * from './financial/useFinancialReportsPage';
export * from './financial/useInvoicesViewPage';
export * from './financial/useMySharePage';
export * from './financial/useMySharePdfHandlers';
export * from './messaging/useBeneficiaryMessages';
export * from './messaging/useSupportPage';
export * from './notifications/useNotificationsPage';
export * from './settings/useBeneficiarySettingsPage';
export * from './views/useAnnualReportViewPage';
export * from './views/useBylawsViewPage';
export * from './views/useContractsViewPage';
export * from './views/usePropertiesViewPage';
