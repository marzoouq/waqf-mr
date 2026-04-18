/**
 * @internal
 * طبقة داخلية مُعاد تصديرها عبر `src/types/index.ts` (barrel).
 *
 * ⚠️ لا تستورد من `@/types/models` مباشرة — استخدم:
 *   `import type { ... } from '@/types';`
 *
 * هذا الملف موجود فقط لتنظيم تعريفات الجداول الأساسية (Row/Insert/Update)
 * في مكان واحد قبل تجميعها في الـbarrel الرئيسي.
 *
 * لكل جدول: نوع الصف (Row) + نوع الإدراج (Insert) + نوع التحديث (Update)
 */
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

// ─── الأدوار ───
export type AppRole = Enums<'app_role'>;

// ─── أنواع الصفوف (Row) ───
export type Property = Tables<'properties'>;
export type Unit = Tables<'units'>;
export type Beneficiary = Tables<'beneficiaries'>;
export type Account = Tables<'accounts'>;
export type UserRole = Tables<'user_roles'>;
export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;
export type Notification = Tables<'notifications'>;
export type FiscalYear = Tables<'fiscal_years'>;
export type AuditLog = Tables<'audit_log'>;
export type AccountCategory = Tables<'account_categories'>;

// ─── أنواع الإدراج (Insert) — للنماذج وnew records ───
export type PropertyInsert = TablesInsert<'properties'>;
export type UnitInsert = TablesInsert<'units'>;
export type BeneficiaryInsert = TablesInsert<'beneficiaries'>;
export type AccountInsert = TablesInsert<'accounts'>;
export type UserRoleInsert = TablesInsert<'user_roles'>;
export type ConversationInsert = TablesInsert<'conversations'>;
export type MessageInsert = TablesInsert<'messages'>;
export type NotificationInsert = TablesInsert<'notifications'>;
export type FiscalYearInsert = TablesInsert<'fiscal_years'>;
export type AccountCategoryInsert = TablesInsert<'account_categories'>;

// ─── أنواع التحديث (Update) — للتعديلات الجزئية ───
export type PropertyUpdate = TablesUpdate<'properties'>;
export type UnitUpdate = TablesUpdate<'units'>;
export type BeneficiaryUpdate = TablesUpdate<'beneficiaries'>;
export type AccountUpdate = TablesUpdate<'accounts'>;
export type UserRoleUpdate = TablesUpdate<'user_roles'>;
export type ConversationUpdate = TablesUpdate<'conversations'>;
export type MessageUpdate = TablesUpdate<'messages'>;
export type NotificationUpdate = TablesUpdate<'notifications'>;
export type FiscalYearUpdate = TablesUpdate<'fiscal_years'>;
export type AccountCategoryUpdate = TablesUpdate<'account_categories'>;
