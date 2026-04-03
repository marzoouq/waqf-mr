/**
 * ثوابت الأدوار المركزية — تُستخدم في التوجيه والتحقق من الصلاحيات
 */
import type { AppRole } from '@/types/database';

/** أدوار الإدارة والمحاسبة */
export const ADMIN_ROLES: AppRole[] = ['admin', 'accountant'];

/** أدوار المدير فقط */
export const ADMIN_ONLY: AppRole[] = ['admin'];
