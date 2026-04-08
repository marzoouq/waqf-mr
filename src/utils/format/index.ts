/**
 * Barrel file — دوال التنسيق والتحقق
 */
export { fmt, fmtInt, fmtSAR, fmtPct, fmtDate, fmtDateHijri } from './format';
export { normalizeArabicDigits } from './normalizeDigits';
export { maskBankAccount, maskNationalId } from './maskData';
export { safeNumber } from './safeNumber';
export { getSafeErrorMessage } from './safeErrorMessage';
export { validateSaudiNationalId, getNationalIdError } from './validateNationalId';
export { getTableNameAr, getOperationNameAr, type AuditLogEntry } from './auditLabels';
