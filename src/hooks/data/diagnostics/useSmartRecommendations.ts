/**
 * useSmartRecommendations — يُجمّع كل مصادر التشخيص ويُخرج توصيات مصنّفة
 */
import { useMemo } from 'react';
import { useIntrusionSummary } from './useIntrusionSummary';
import { useDbStats } from './useDbStats';
import { useEdgeFunctionsStats } from './useEdgeFunctionsStats';
import { useClientErrors } from '@/hooks/data/audit/useClientErrors';

export type RecommendationSeverity = 'critical' | 'warning' | 'info';
export type RecommendationAction =
  | 'clear_cache'
  | 'unregister_sw'
  | 'refresh_token'
  | 'reset_realtime'
  | 'hard_reload'
  | 'goto_users'
  | 'goto_audit'
  | 'none';

export interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  action?: RecommendationAction;
  actionLabel?: string;
}

export const useSmartRecommendations = () => {
  const intrusion = useIntrusionSummary(24);
  const db = useDbStats();
  const ef = useEdgeFunctionsStats(24);
  const errors = useClientErrors();

  const isLoading = intrusion.isLoading || db.isLoading || ef.isLoading || errors.isLoading;

  const recommendations = useMemo<Recommendation[]>(() => {
    const list: Recommendation[] = [];
    const s = intrusion.data;
    const d = db.data;
    const e = ef.data;
    const errs = errors.data ?? [];

    if (s) {
      if (s.failed_logins >= 10) {
        list.push({
          id: 'sec_brute',
          severity: 'critical',
          title: `${s.failed_logins} محاولة دخول فاشلة خلال 24 ساعة`,
          description: 'يشير إلى محاولة اختراق محتملة. راجع سجل الوصول وأقفل الحسابات المستهدفة.',
          action: 'goto_audit',
          actionLabel: 'افتح سجل الوصول',
        });
      } else if (s.failed_logins >= 3) {
        list.push({
          id: 'sec_brute_low',
          severity: 'warning',
          title: `${s.failed_logins} محاولة دخول فاشلة`,
          description: 'ارتفاع طفيف — راقب المصادر.',
          action: 'goto_audit',
          actionLabel: 'راجع السجل',
        });
      }
      if (s.rls_violations > 0) {
        list.push({
          id: 'sec_rls',
          severity: 'critical',
          title: `${s.rls_violations} انتهاك صلاحيات (RLS)`,
          description: 'مستخدم حاول الوصول لبيانات محجوبة. تحقق من صلاحيات الأدوار.',
          action: 'goto_users',
          actionLabel: 'إدارة المستخدمين',
        });
      }
      if (s.role_changes > 0) {
        list.push({
          id: 'sec_roles',
          severity: 'warning',
          title: `${s.role_changes} تغيير أدوار مؤخراً`,
          description: 'راجع تغييرات الصلاحيات للتأكد من مشروعيتها.',
          action: 'goto_audit',
          actionLabel: 'افتح سجل المراجعة',
        });
      }
    }

    if (d && d.saturation_pct >= 80) {
      list.push({
        id: 'db_saturation',
        severity: 'critical',
        title: `اتصالات قاعدة البيانات ${d.saturation_pct}%`,
        description: `${d.total_connections} من ${d.max_connections}. يُنصح بترقية حجم Cloud instance.`,
      });
    } else if (d && d.saturation_pct >= 60) {
      list.push({
        id: 'db_saturation_warn',
        severity: 'warning',
        title: `اتصالات قاعدة البيانات ${d.saturation_pct}%`,
        description: 'الحمل مرتفع — راقب الأداء.',
      });
    }

    if (e && e.functions.length > 0) {
      for (const f of e.functions) {
        const rate = f.total > 0 ? (f.errors / f.total) * 100 : 0;
        if (rate >= 20 && f.total >= 5) {
          list.push({
            id: `ef_${f.function_name}`,
            severity: 'critical',
            title: `دالة ${f.function_name}: نسبة فشل ${rate.toFixed(0)}%`,
            description: `${f.errors} فشل من ${f.total} استدعاء. راجع سجلات Edge Function.`,
          });
        }
      }
    }

    if (errs.length >= 20) {
      list.push({
        id: 'client_errors_high',
        severity: 'warning',
        title: `${errs.length} خطأ عميل مسجّل`,
        description: 'ارتفاع في أخطاء الواجهة — راجع تبويب "الأخطاء الحية".',
        action: 'clear_cache',
        actionLabel: 'امسح الكاش',
      });
    }

    if (list.length === 0 && !isLoading) {
      list.push({
        id: 'ok',
        severity: 'info',
        title: 'لا توجد توصيات حالياً',
        description: 'النظام يعمل ضمن الحدود الطبيعية.',
      });
    }

    return list;
  }, [intrusion.data, db.data, ef.data, errors.data, isLoading]);

  const criticalCount = recommendations.filter((r) => r.severity === 'critical').length;
  const warningCount = recommendations.filter((r) => r.severity === 'warning').length;

  return { recommendations, isLoading, criticalCount, warningCount, refetch: () => {
    void intrusion.refetch(); void db.refetch(); void ef.refetch(); void errors.refetch();
  } };
};
