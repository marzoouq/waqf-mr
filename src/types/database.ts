export type AppRole = 'admin' | 'beneficiary' | 'waqif' | 'accountant';

export interface Property {
  id: string;
  property_number: string;
  property_type: string;
  location: string;
  area: number;
  description?: string;
  vat_exempt?: boolean;
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
  fiscal_year_id?: string;
  notes?: string;
  tenant_id_type?: string;
  tenant_id_number?: string;
  tenant_street?: string;
  tenant_building?: string;
  tenant_district?: string;
  tenant_city?: string;
  tenant_postal_code?: string;
  tenant_tax_number?: string;
  tenant_crn?: string;
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
  fiscal_year_id?: string;
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
  fiscal_year_id?: string;
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
  fiscal_year_id?: string | null;
  total_income: number;
  total_expenses: number;
  admin_share: number;
  waqif_share: number;
  waqf_revenue: number;
  vat_amount: number;
  distributions_amount: number;
  net_after_expenses: number;
  net_after_vat: number;
  zakat_amount: number;
  waqf_corpus_manual: number;
  waqf_corpus_previous: number;
  created_at: string;
  updated_at: string;
}

export interface AdvanceRequest {
  id: string;
  beneficiary_id: string;
  fiscal_year_id: string | null;
  amount: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  beneficiary?: Beneficiary;
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

export interface Conversation {
  id: string;
  type: string;
  subject: string | null;
  status: string;
  created_by: string;
  participant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface FiscalYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'closed';
  published: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  created_at: string;
}
