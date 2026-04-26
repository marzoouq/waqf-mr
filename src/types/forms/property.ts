/**
 * أنواع نماذج العقارات والوحدات
 *
 * UnitInsert يأتي من types/models.ts (مولّد من schema قاعدة البيانات).
 * هذا الملف لا يُكرّر التعريف بل يستهلكه.
 */
import type { UnitInsert } from '@/types/models';

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
