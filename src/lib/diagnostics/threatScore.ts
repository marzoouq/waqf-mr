/**
 * threatScore — خوارزمية حساب مستوى التهديد الأمني
 * تُغذّى من admin_intrusion_summary وتُخرج مستوى + شرح.
 */
import type { IntrusionSummary } from '@/hooks/data/diagnostics/useIntrusionSummary';

export type ThreatLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface ThreatAssessment {
  level: ThreatLevel;
  score: number;
  color: string;
  label: string;
  reasons: string[];
}

/**
 * Formula: failedLogins*3 + rlsViolations*5 + unauthorized*4 + roleChanges*2 + criticalErrors*1
 * Thresholds: 0=safe, 1-10=low, 11-30=medium, 31-70=high, 71+=critical
 */
export function computeThreatScore(s: IntrusionSummary | undefined | null): ThreatAssessment {
  if (!s) {
    return { level: 'safe', score: 0, color: 'hsl(var(--muted-foreground))', label: 'لا بيانات', reasons: [] };
  }
  const reasons: string[] = [];
  let score = 0;

  if (s.failed_logins > 0) {
    const w = s.failed_logins * 3;
    score += w;
    reasons.push(`${s.failed_logins} محاولة دخول فاشلة`);
  }
  if (s.rls_violations > 0) {
    score += s.rls_violations * 5;
    reasons.push(`${s.rls_violations} انتهاك صلاحيات (RLS)`);
  }
  if (s.unauthorized_access > 0) {
    score += s.unauthorized_access * 4;
    reasons.push(`${s.unauthorized_access} وصول غير مصرح`);
  }
  if (s.role_changes > 0) {
    score += s.role_changes * 2;
    reasons.push(`${s.role_changes} تغيير أدوار`);
  }
  if (s.client_errors > 10) {
    score += Math.min(s.client_errors, 100);
    reasons.push(`${s.client_errors} خطأ عميل`);
  }

  let level: ThreatLevel = 'safe';
  let color = 'hsl(var(--primary))';
  let label = 'آمن';

  if (score > 70) { level = 'critical'; color = 'hsl(var(--destructive))'; label = 'حرج'; }
  else if (score > 30) { level = 'high'; color = 'hsl(24 95% 53%)'; label = 'مرتفع'; }
  else if (score > 10) { level = 'medium'; color = 'hsl(38 92% 50%)'; label = 'متوسط'; }
  else if (score > 0) { level = 'low'; color = 'hsl(142 71% 45%)'; label = 'منخفض'; }

  return { level, score, color, label, reasons };
}
