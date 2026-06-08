/**
 * diagnosticsReadService — قراءات DB مخصّصة لفحوصات التشخيص (cardConsistency, numericalAudit).
 * يُبقي ملفات lib/diagnostics/checks/ ضمن حدود المعمارية (لا supabase خام خارج services/auth/api/realtime).
 * كل الدوال قراءة فقط.
 */
import { supabase } from '@/integrations/supabase/client';

export interface FySnapshot {
  id: string;
  label: string;
  status: string;
}

export interface AccountBasic {
  fiscal_year: string | number | null;
  waqf_revenue: number | null;
  waqf_corpus_manual: number | null;
}

export interface AccountForFy {
  waqf_revenue: number | null;
  waqf_corpus_manual: number | null;
}

export interface AccountSnapshot {
  total_income: number | null;
  total_expenses: number | null;
  waqf_revenue: number | null;
  waqf_corpus_manual: number | null;
}

export interface BeneficiaryShare {
  id: string;
  name: string;
  share_percentage: number | null;
}

export interface DistributionRow {
  beneficiary_id: string;
  amount: number | null;
}

export interface AdvanceRow {
  beneficiary_id: string;
  amount: number | null;
  status: string;
}

export interface OpenInvoiceRow {
  id: string;
  due_date: string;
  status: string;
}

export interface CarryforwardRow {
  id: string;
  amount: number | null;
  from_fiscal_year_id: string | null;
  to_fiscal_year_id: string | null;
  status: string | null;
}

export interface AmountRow {
  amount: number | null;
}

export interface RpcAggregated {
  totals?: {
    total_income?: number;
    total_expenses?: number;
    waqf_revenue?: number;
    waqf_corpus_manual?: number;
    available_amount?: number;
  };
}

export const diagnosticsReadService = {
  async listAccountsBasic(limit = 1000) {
    const { data, error } = await supabase
      .from('accounts')
      .select('fiscal_year, waqf_revenue, waqf_corpus_manual')
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AccountBasic[];
  },

  async listClosedFiscalYears(limit = 50) {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('id, label, status')
      .eq('status', 'closed')
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as FySnapshot[];
  },

  async getLatestClosedFy(): Promise<FySnapshot | null> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('id, label, status')
      .eq('status', 'closed')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as FySnapshot) ?? null;
  },

  async getActiveFy(): Promise<FySnapshot | null> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('id, label, status')
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return (data as FySnapshot) ?? null;
  },

  async getLatestFy(): Promise<FySnapshot | null> {
    const active = await this.getActiveFy();
    if (active) return active;
    return this.getLatestClosedFy();
  },

  async getAccountForFy(fyId: string): Promise<AccountForFy | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('waqf_revenue, waqf_corpus_manual')
      .eq('fiscal_year_id', fyId)
      .maybeSingle();
    if (error) throw error;
    return (data as AccountForFy) ?? null;
  },

  async getAccountSnapshotForFy(fyId: string): Promise<AccountSnapshot | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('total_income, total_expenses, waqf_revenue, waqf_corpus_manual')
      .eq('fiscal_year_id', fyId)
      .maybeSingle();
    if (error) throw error;
    return (data as AccountSnapshot) ?? null;
  },

  async listDistributionsByFy(fyId: string) {
    const { data, error } = await supabase
      .from('distributions')
      .select('beneficiary_id, amount')
      .eq('fiscal_year_id', fyId);
    if (error) throw error;
    return (data ?? []) as DistributionRow[];
  },

  async listBeneficiariesWithShare() {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('id, name, share_percentage')
      .gt('share_percentage', 0);
    if (error) throw error;
    return (data ?? []) as BeneficiaryShare[];
  },

  async listApprovedAdvancesByFy(fyId: string) {
    const { data, error } = await supabase
      .from('advance_requests')
      .select('beneficiary_id, amount, status')
      .eq('fiscal_year_id', fyId)
      .in('status', ['approved', 'paid']);
    if (error) throw error;
    return (data ?? []) as AdvanceRow[];
  },

  async listOpenPaymentInvoices(limit = 2000) {
    const { data, error } = await supabase
      .from('payment_invoices')
      .select('id, due_date, status')
      .in('status', ['pending', 'partially_paid'])
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as OpenInvoiceRow[];
  },

  async listCarryforwardRecords(limit = 2000) {
    const { data, error } = await supabase
      .from('advance_carryforward')
      .select('id, amount, from_fiscal_year_id, to_fiscal_year_id, status')
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as CarryforwardRow[];
  },

  async listIncomeByFy(fyId: string) {
    const { data, error } = await supabase
      .from('income')
      .select('amount')
      .eq('fiscal_year_id', fyId);
    if (error) throw error;
    return (data ?? []) as AmountRow[];
  },

  async listExpensesByFy(fyId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .eq('fiscal_year_id', fyId);
    if (error) throw error;
    return (data ?? []) as AmountRow[];
  },

  async getDashboardFullSummary(fyId: string): Promise<RpcAggregated | null> {
    try {
      // RPC مغلقة على authenticated — تُستدعى عبر Edge `dashboard-summary` (يتحقق من الدور).
      const { invoke } = await import('@/lib/api/invoke');
      const res = await invoke<{ aggregated: unknown }>('dashboard-summary', {
        body: { fiscal_year_id: fyId },
      });
      return ((res?.aggregated as RpcAggregated) ?? null);
    } catch {
      return null;
    }
  },
};
