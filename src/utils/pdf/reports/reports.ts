/**
 * Barrel — reports/reports
 *
 * يُعيد تصدير دوال PDF السنوية المُقسَّمة إلى ملفات منفصلة (موجة 17).
 * الإبقاء على هذا الملف مهم: `utils/pdf/index.ts` يستورد منه مباشرة.
 */
export { generateAnnualReportPDF } from './annualReportPdf';
export type { ReportData } from './annualReportPdf';
export { generateAnnualDisclosurePDF } from './annualDisclosurePdf';
export type { AnnualDisclosureData } from './annualDisclosurePdf';
export { generateBeneficiaryStatementPDF } from './beneficiaryStatementPdf';
