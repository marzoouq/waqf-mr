/**
 * أنواع نماذج العقارات والوحدات
 *
 * UnitInsert: شكل الإدخال لوحدة جديدة (مصدر الحقيقة).
 * يُستهلك في hooks/data/properties/useUnits.ts (re-export للتوافق).
 */
export interface UnitInsert {
  property_id: string;
  unit_number: string;
  unit_type?: string;
  floor?: string;
  area?: number;
  status?: string;
  notes?: string;
}

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
