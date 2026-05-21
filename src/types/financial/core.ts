/**
 * الأنواع المالية المشتركة — مصدر واحد للحقيقة
 *
 * المصدر الوحيد لاستيراد `Tables<'accounts'>` خارج `src/integrations/`
 * يحفظ مبدأ "utils ≠ supabase" حيث تستورد utils/financial من هذا الملف بدلاً من Supabase types مباشرة.
 */
import type { Tables } from '@/integrations/supabase/types';

/** سجل الحساب الختامي كما هو مخزّن في قاعدة البيانات */
export type AccountRecord = Tables<'accounts'>;

/** مدخلات حساب التسلسل المالي للسنة المفتوحة (مع حصص) */
export interface FinancialParams {
  totalIncome: number;
  totalExpenses: number;
  waqfCorpusPrevious: number;
  manualVat: number;
  zakatAmount: number;
  adminPercent: number;
  waqifPercent: number;
  waqfCorpusManual: number;
  manualDistributions: number;
  /** عند false (سنة نشطة) تُصفّر الحصص ورقبة الوقف */
  isClosed?: boolean;
}

/** نتيجة موحّدة لكل حسابات التسلسل المالي (نشطة/مقفلة) */
export interface FinancialResult {
  grandTotal: number;
  netAfterExpenses: number;
  netAfterVat: number;
  netAfterZakat: number;
  shareBase: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  availableAmount: number;
  remainingBalance: number;
  /** true عندما يكون availableAmount سالباً (المصروفات تتجاوز الإيرادات) */
  isDeficit: boolean;
}

/** مدخلات حساب المؤشرات لسنة نشطة (الحصص تُصفّر) */
export interface ActiveYearParams {
  totalIncome: number;
  totalExpenses: number;
  waqfCorpusPrevious: number;
  vatAmount: number;
  zakatAmount: number;
}

/** مدخلات حساب المؤشرات لسنة مقفلة (تقرأ القيم من account) */
export interface ClosedYearParams {
  account: AccountRecord;
  waqfCorpusPrevious: number;
  waqfCorpusManual: number;
  distributionsAmount: number;
}
