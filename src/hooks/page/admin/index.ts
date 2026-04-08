/**
 * تصدير مركزي لهوكات الصفحات — admin
 */
export * from './dashboard';
export * from './contracts';
export * from './reports';
export * from './settings';

// financial — تصدير مسمّى لتجنب تعارض الأسماء
export { useCarryforwardData } from './financial/useCarryforwardData';
export { useCollectionData } from './financial/useCollectionData';
export { useCreateInvoiceForm } from './financial/useCreateInvoiceForm';
export { useDistributionCalculation } from './financial/useDistributionCalculation';
export { useExpensesPage } from './financial/useExpensesPage';
export { useFiscalYearManagement } from './financial/useFiscalYearManagement';
export { useIncomePage } from './financial/useIncomePage';
export { useInvoicesPage } from './financial/useInvoicesPage';
export { usePaymentInvoiceActions } from './financial/usePaymentInvoiceActions';
export { usePaymentInvoicesTab } from './financial/usePaymentInvoicesTab';
