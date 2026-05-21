/**
 * أنواع مشتركة لفحوصات التشخيص
 */
export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface DiagnosticCategory {
  title: string;
  checks: (() => Promise<CheckResult>)[];
}
