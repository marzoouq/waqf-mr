/**
 * أنواع ZATCA المشتركة (نتائج فحص الامتثال + شهادات)
 */

/**
 * النسخة الآمنة من شهادة ZATCA (بدون مفاتيح خاصة) — تأتي من view: zatca_certificates_safe
 */
export interface ZatcaCertificateSafe {
  id: string;
  certificate_type: string;
  is_active: boolean | null;
  request_id: string | null;
  created_at: string | null;
  expires_at: string | null;
}

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
