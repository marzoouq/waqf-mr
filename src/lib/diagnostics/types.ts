/**
 * أنواع مشتركة لفحوصات التشخيص
 */
export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

export type DiagnosticEnv = 'dev' | 'preview' | 'prod';

export interface CheckMeta {
  fnName?: string;
  httpStatus?: number;
  ms?: number;
  env?: DiagnosticEnv;
  /** سبب اختياري عند التحذيرات المُستهدفة (مثل cors_preview) */
  reason?: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** بيانات إضافية اختيارية — لا تكسر الفحوصات القائمة */
  meta?: CheckMeta;
}

export interface DiagnosticCategory {
  title: string;
  checks: (() => Promise<CheckResult>)[];
}

/**
 * تحديد البيئة الحالية اعتماداً على hostname.
 */
export function detectEnv(): DiagnosticEnv {
  if (typeof window === 'undefined') return 'prod';
  const h = window.location.hostname;
  if (h.includes('preview--') || h.includes('id-preview--')) return 'preview';
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.lovableproject.com')) return 'dev';
  return 'prod';
}
