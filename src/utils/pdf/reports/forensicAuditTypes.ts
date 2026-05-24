/**
 * أنواع وألوان حالة تقرير الفحص الجنائي — مستخرجة لتقليل حجم الملف الرئيسي
 */
import type { getPdfThemeColors } from '../core/themeColors';

export interface ForensicAuditCategory {
  category: string;
  status: 'سليم' | 'مُصحح' | 'ملاحظة';
  details: string;
  score: string;
}

export interface ForensicSecurityFinding {
  finding: string;
  severity: 'خطأ' | 'تحذير' | 'معلومة';
  status: 'مُعالج' | 'مُتجاهل' | 'معلق';
  notes: string;
}

export interface ForensicAuditData {
  auditDate: string;
  auditorName: string;
  overallScore: number;
  totalFiles: number;
  issuesFound: number;
  issuesFixed: number;
  categories: ForensicAuditCategory[];
  securityFindings: ForensicSecurityFinding[];
}

type ThemeColors = ReturnType<typeof getPdfThemeColors>;
type ColorTuple = [number, number, number];

/** خرائط ألوان الحالة — تُولَّد ديناميكياً من الثيم النشط */
export const buildStatusColors = (theme: ThemeColors): Record<string, ColorTuple> => ({
  'سليم': theme.primary,
  'مُصحح': theme.secondary,
  'ملاحظة': theme.destructive,
  'مُعالج': theme.primary,
  'مُتجاهل': [100, 100, 100],
  'معلق': theme.destructive,
});

export const buildSeverityColors = (theme: ThemeColors): Record<string, ColorTuple> => ({
  'خطأ': theme.destructive,
  'تحذير': theme.secondary,
  'معلومة': [59, 130, 246],
});
