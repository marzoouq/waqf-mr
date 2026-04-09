/**
 * أنواع نماذج العقارات والوحدات
 */
import type { UnitInsert } from '@/hooks/data/properties/useUnits';

export interface UnitFormData extends UnitInsert {
  tenant_name?: string;
  rent_amount?: string;
  payment_type?: string;
  payment_count?: string;
  contract_start_date?: string;
  contract_end_date?: string;
}

export interface WholeRentalForm {
  tenant_name: string;
  rent_amount: string;
  payment_type: string;
  payment_count: string;
  start_date: string;
  end_date: string;
}
