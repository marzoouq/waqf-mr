/**
 * Barrel — utils/pdf
 * يُستهلك حصراً عبر dynamic imports `await import('@/utils/pdf')` للحفاظ على code-splitting.
 * لا تحذف — البحث النصي العادي لا يكتشف dynamic imports.
 */
export { generateAccountsPDF, generateDistributionsPDF } from './entities/accounts';
export { generateAuditLogPDF } from './entities/auditLog';
export { generateBeneficiariesPDF, generateContractsPDF, generatePropertiesPDF, generateUnitsPDF } from './entities/entities';
export { generateBylawsPDF } from './entities/bylaws';
export { generateDisclosurePDF, generateMySharePDF } from './entities/beneficiary';
export { generateExpensesPDF, generateIncomePDF } from './entities/expenses';
export { generateInvoicesViewPDF, generateOverdueInvoicesPDF } from './invoices/invoices';
export { generateAnnualReportPDF } from './reports/annualReport';
export { generateComprehensiveBeneficiaryPDF } from './reports/comprehensiveBeneficiary';
export { generateYearComparisonPDF } from './reports/comparison';
