export type AppRole = 'admin' | 'beneficiary' | 'waqif';

export interface Property {
  id: string;
  property_number: string;
  property_type: string;
  location: string;
  area: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: string;
  floor?: string;
  area?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  property_id: string;
  unit_id?: string;
  tenant_name: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  status: string;
  payment_type?: string;
  payment_count?: number;
  payment_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  property?: Property;
  unit?: Unit | null;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  property_id?: string;
  contract_id?: string;
  notes?: string;
  created_at: string;
  property?: Property;
  contract?: Contract;
}

export interface Expense {
  id: string;
  expense_type: string;
  amount: number;
  date: string;
  property_id?: string;
  description?: string;
  created_at: string;
  property?: Property;
}

export interface Beneficiary {
  id: string;
  user_id?: string;
  name: string;
  share_percentage: number;
  phone?: string;
  email?: string;
  bank_account?: string;
  national_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  fiscal_year: string;
  total_income: number;
  total_expenses: number;
  admin_share: number;
  waqif_share: number;
  waqf_revenue: number;
  vat_amount: number;
  distributions_amount: number;
  waqf_capital: number;
  net_after_expenses: number;
  net_after_vat: number;
  created_at: string;
  updated_at: string;
}

export interface Distribution {
  id: string;
  beneficiary_id: string;
  account_id: string;
  amount: number;
  date: string;
  status: string;
  created_at: string;
  beneficiary?: Beneficiary;
  account?: Account;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}
