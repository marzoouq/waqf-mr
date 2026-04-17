/**
 * أنواع بيانات السُلف والترحيل
 *
 * #38 من تقرير الفحص: تحوي حقولاً محسوبة (beneficiary_name من join) غير موجودة
 * في Database types المولّدة. الفصل مقصود — لا تستبدلها بـ Tables<'advance_requests'>.
 */

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
  beneficiary?: { id: string; name: string; share_percentage: number; user_id: string | null };
  fiscal_year?: { label: string } | null;
}

export interface AdvanceCarryforward {
  id: string;
  beneficiary_id: string;
  from_fiscal_year_id: string;
  to_fiscal_year_id: string | null;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}
