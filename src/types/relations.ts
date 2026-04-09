/**
 * أنواع مع علاقات Join — تمتد من الأنواع الأساسية في models.ts
 * تُستخدم عند جلب بيانات مع select('*, property:properties(*)') وما شابه
 */
import type { Tables } from '@/integrations/supabase/types';
import type { Property, Unit, Beneficiary, Account } from './models';

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


export type Distribution = Tables<'distributions'> & {
  beneficiary?: Beneficiary;
  account?: Account;
};
