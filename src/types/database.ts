/**
 * أنواع قاعدة البيانات — طبقة رفيعة تعيد التصدير من الأنواع المولّدة تلقائياً
 * لا تُضف أنواعاً يدوية هنا — أي تغيير في الجداول ينعكس تلقائياً
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

// ─── أنواع مع علاقات Join (تمتد من الأنواع الأساسية) ───
export type Contract = Tables<'contracts'> & {
  property?: Property;
  unit?: Unit | null;
};

export type Income = Tables<'income'> & {
  property?: Property;
  contract?: Contract;
};

export type Expense = Tables<'expenses'> & {
  property?: Property;
};

export type AdvanceRequest = Tables<'advance_requests'> & {
  beneficiary?: Beneficiary;
};

export type Distribution = Tables<'distributions'> & {
  beneficiary?: Beneficiary;
  account?: Account;
};
