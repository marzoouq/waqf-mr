/**
 * أنواع بيانات لوحة التحكم — مفصولة لتقليل حجم الهوك الرئيسي
 */

// ═══ أنواع البيانات المُجمّعة من RPC ═══
export interface AggregatedTotals {
  total_income: number;
  total_expenses: number;
  net_after_expenses: number;
  contractual_revenue: number;
  grand_total: number;
  vat_amount: number;
  zakat_amount: number;
  net_after_vat: number;
  net_after_zakat: number;
  admin_share: number;
  waqif_share: number;
  waqf_revenue: number;
  waqf_corpus_manual: number;
  waqf_corpus_previous: number;
  distributions_amount: number;
  available_amount: number;
  remaining_balance: number;
  share_base: number;
}

export interface AggregatedCollection {
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
  overdue_count: number;
  total: number;
  percentage: number;
  total_collected: number;
  total_expected: number;
}

export interface AggregatedOccupancy {
  rented_units: number;
  total_units: number;
  rate: number;
}

export interface AggregatedCounts {
  properties: number;
  active_contracts: number;
  beneficiaries: number;
  pending_advances: number;
  expiring_contracts: number;
  orphaned_contracts: number;
  unsubmitted_zatca: number;
}

export interface AggregatedYoY {
  prev_fy_id: string | null;
  prev_label: string | null;
  prev_income: number;
  prev_expenses: number;
  has_prev: boolean;
}

export interface AggregatedFiscalYear {
  id: string;
  label: string;
  status: string;
  start_date: string;
  end_date: string;
  published: boolean;
  created_at?: string;
}

export interface AggregatedBeneficiary {
  id: string;
  name: string;
  share_percentage: number;
  user_id: string | null;
}

export interface AggregatedData {
  totals: AggregatedTotals;
  collection: AggregatedCollection;
  occupancy: AggregatedOccupancy;
  counts: AggregatedCounts;
  monthly_data: Array<{ month: string; income: number; expenses: number }>;
  expense_types: Array<{ name: string; value: number }>;
  yoy: AggregatedYoY;
  fiscal_years: AggregatedFiscalYear[];
  settings: Record<string, string>;
  beneficiaries: AggregatedBeneficiary[];
  fiscal_year_id: string;
  fiscal_year_status: string;
  fiscal_year_label: string;
  is_closed: boolean;
}

// ═══ أنواع الصفوف الخام المحدودة ═══
export interface HeatmapInvoice {
  id: string;
  contract_id: string;
  invoice_number: string;
  payment_number: number;
  due_date: string;
  amount: number;
  status: string;
  paid_date: string | null;
  paid_amount: number | null;
  zatca_status: string | null;
  fiscal_year_id: string | null;
  contract?: {
    contract_number: string;
    tenant_name: string;
    property_id: string;
    payment_count: number;
    property?: { property_number: string };
  };
}

export interface PendingAdvance {
  id: string;
  beneficiary_id: string;
  fiscal_year_id: string | null;
  amount: number;
  status: string;
  reason: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  beneficiary?: { id: string; name: string; share_percentage: number; user_id: string | null };
  fiscal_year?: { label: string };
}

export interface RecentContract {
  id: string;
  contract_number: string;
  tenant_name: string;
  property_id: string;
  unit_id: string | null;
  start_date: string;
  end_date: string;
  rent_amount: number;
  payment_type: string;
  payment_count: number;
  payment_amount: number | null;
  status: string;
  fiscal_year_id: string | null;
  created_at: string;
  property?: { id: string; property_number: string };
  unit?: { id: string; unit_number: string; status: string };
}

export interface DashboardSummaryResponse {
  aggregated: AggregatedData;
  pending_advances: PendingAdvance[];
  fetched_at: string;
}
