/**
 * ثوابت الأدوار المركزية — تُستخدم في التوجيه والتحقق من الصلاحيات
 * مصدر واحد للحقيقة لكل ما يخص الأدوار
 */
import type { AppRole } from '@/types';

// ─── مصفوفات الأدوار ───

/** أدوار المدير فقط */
export const ADMIN_ONLY: AppRole[] = ['admin'];

/** أدوار الإدارة والمحاسبة */
export const ADMIN_ROLES: AppRole[] = ['admin', 'accountant'];

/** أدوار الدعم الفني — الناظر يمتلك كامل صلاحيات الدعم أيضاً */
export const SUPPORT_ROLES: AppRole[] = ['admin', 'support'];

/** أدوار المستفيد + المدير */
export const BENEFICIARY_ROLES: AppRole[] = ['admin', 'beneficiary'];

/** أدوار الواقف + المدير */
export const WAQIF_ROLES: AppRole[] = ['admin', 'waqif'];

/** كل الأدوار باستثناء المحاسب */
export const ALL_NON_ACCOUNTANT: AppRole[] = ['admin', 'beneficiary', 'waqif'];

/** الأدوار المستثناة من إجبار وضع الصيانة (يدخلون بشكل طبيعي) */
export const MAINTENANCE_BYPASS_ROLES: AppRole[] = ['admin', 'support'];

/** جميع الأدوار في النظام */
export const ALL_ROLES: AppRole[] = ['admin', 'accountant', 'beneficiary', 'waqif', 'support'];

// ─── تسميات الأدوار ───

export const ROLE_LABELS: Record<string, string> = {
  admin: 'ناظر الوقف',
  beneficiary: 'مستفيد',
  waqif: 'واقف',
  accountant: 'محاسب',
  support: 'الدعم الفني',
};
