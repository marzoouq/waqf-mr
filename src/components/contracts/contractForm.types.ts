export type RentalMode = 'full' | 'single' | 'multi';
export type PricingMode = 'total' | 'per_unit';

export interface ContractFormData {
  contract_number: string;
  property_id: string;
  unit_id: string;
  tenant_name: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  status: string;
  notes: string;
  payment_type: string;
  payment_count: string;
  rental_mode: RentalMode;
  selected_unit_ids: string[];
  pricing_mode: PricingMode;
  rent_per_unit: Record<string, string>;
  vat_applicable: boolean;
  tenant_id_type: string;
  tenant_id_number: string;
  tenant_tax_number: string;
  tenant_crn: string;
  tenant_street: string;
  tenant_building: string;
  tenant_district: string;
  tenant_city: string;
  tenant_postal_code: string;
}

export const emptyFormData: ContractFormData = {
  contract_number: '', property_id: '', unit_id: '', tenant_name: '', start_date: '', end_date: '', rent_amount: '', status: 'active', notes: '',
  payment_type: 'annual', payment_count: '1',
  rental_mode: 'single', selected_unit_ids: [], pricing_mode: 'total', rent_per_unit: {},
  vat_applicable: false,
  tenant_id_type: 'NAT', tenant_id_number: '', tenant_tax_number: '', tenant_crn: '', tenant_street: '', tenant_building: '', tenant_district: '', tenant_city: '', tenant_postal_code: '',
};