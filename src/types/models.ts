/**
 * أنواع الجداول الأساسية — إعادة تصدير مختصرة من الأنواع المولّدة تلقائياً
 * كل نوع يُطابق صف (Row) واحد في الجدول المقابل
 */
import type { Tables, Enums } from '@/integrations/supabase/types';

// ─── الأدوار ───
export type AppRole = Enums<'app_role'>;

// ─── أنواع أساسية (بدون علاقات) ───
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
