/**
 * أنواع ZATCA المشتركة (نتائج فحص الامتثال)
 */

export interface ComplianceMessage {
  code: string;
  message: string;
}

export interface ComplianceResult {
  warningMessages?: ComplianceMessage[];
  errorMessages?: ComplianceMessage[];
  infoMessages?: ComplianceMessage[];
  validationResults?: {
    status?: string;
    warningMessages?: ComplianceMessage[];
    errorMessages?: ComplianceMessage[];
    infoMessages?: ComplianceMessage[];
  };
}
