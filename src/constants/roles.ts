/**
 * ثوابت الأدوار المركزية — تُستخدم في التوجيه والتحقق من الصلاحيات
 * مصدر واحد للحقيقة لكل ما يخص الأدوار
 */
import type { AppRole } from '@/types/database';

// ─── مصفوفات الأدوار ───

/** أدوار المدير فقط */
export const ADMIN_ONLY: AppRole[] = ['admin'];

/** أدوار الإدارة والمحاسبة */
export const ADMIN_ROLES: AppRole[] = ['admin', 'accountant'];

/** أدوار المستفيد + المدير */
export const BENEFICIARY_ROLES: AppRole[] = ['admin', 'beneficiary'];

/** كل الأدوار باستثناء المحاسب */
export const ALL_NON_ACCOUNTANT: AppRole[] = ['admin', 'beneficiary', 'waqif'];

/** جميع الأدوار في النظام */
export const ALL_ROLES: AppRole[] = ['admin', 'accountant', 'beneficiary', 'waqif'];

// ─── تسميات الأدوار ───

export const ROLE_LABELS: Record<string, string> = {
  admin: 'ناظر الوقف',
  beneficiary: 'مستفيد',
  waqif: 'واقف',
  accountant: 'محاسب',
};
