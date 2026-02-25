// Re-export all PDF types and generators for backward compatibility
export type { PdfWaqfInfo } from './core';
export { type UnitPdfRow } from './core';
export { generateAnnualReportPDF, generateBeneficiaryStatementPDF, generateAnnualDisclosurePDF } from './reports';
export { generatePropertiesPDF, generateContractsPDF, generateBeneficiariesPDF, generateUnitsPDF } from './entities';
export { generateIncomePDF, generateExpensesPDF } from './expenses';
export { generateAccountsPDF, generateDistributionsPDF } from './accounts';
export { generateMySharePDF, generateDisclosurePDF } from './beneficiary';
export { generateInvoicesViewPDF } from './invoices';
export { generateYearComparisonPDF } from './comparison';
export type { YearComparisonPdfData } from './comparison';
export { generateForensicAuditPDF } from './forensicAudit';
export type { ForensicAuditData } from './forensicAudit';
export { generateBylawsPDF } from './bylaws';
export type { BylawPdfEntry } from './bylaws';
