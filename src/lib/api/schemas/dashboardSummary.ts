/**
 * Zod schema لاستجابة Edge Function `dashboard-summary`.
 *
 * تصميم متعمَّد متسامح: الحقول الداخلية كلها `.optional()` للسماح بتطوّر RPC
 * تدريجياً دون كسر الواجهة. القيمة المُضافة مقابل النسخة السابقة (`z.unknown`):
 *  - يكتشف drift في الأنواع (مثلاً total_income كنص بدل رقم)
 *  - يكتشف أقسام مفقودة كلياً (مثلاً غياب `aggregated.totals`)
 *  - يبقى مرناً عند إضافة حقول جديدة من RPC
 *
 * المرجع: supabase/functions/dashboard-summary/index.ts + types/financial/dashboard.ts
 */
import { z } from 'zod';

const aggregatedTotalsSchema = z.object({
  total_income: z.number().optional(),
  total_expenses: z.number().optional(),
  net_after_expenses: z.number().optional(),
  contractual_revenue: z.number().optional(),
  grand_total: z.number().optional(),
  vat_amount: z.number().optional(),
  zakat_amount: z.number().optional(),
  net_after_vat: z.number().optional(),
  net_after_zakat: z.number().optional(),
  admin_share: z.number().optional(),
  waqif_share: z.number().optional(),
  waqf_revenue: z.number().optional(),
  waqf_corpus_manual: z.number().optional(),
  waqf_corpus_previous: z.number().optional(),
  distributions_amount: z.number().optional(),
  available_amount: z.number().optional(),
  remaining_balance: z.number().optional(),
  share_base: z.number().optional(),
}).passthrough();

const aggregatedCollectionSchema = z.object({
  paid_count: z.number().optional(),
  partial_count: z.number().optional(),
  unpaid_count: z.number().optional(),
  overdue_count: z.number().optional(),
  total: z.number().optional(),
  percentage: z.number().optional(),
  total_collected: z.number().optional(),
  total_expected: z.number().optional(),
}).passthrough();

const aggregatedOccupancySchema = z.object({
  rented_units: z.number().optional(),
  total_units: z.number().optional(),
  rate: z.number().optional(),
}).passthrough();

const aggregatedCountsSchema = z.object({
  properties: z.number().optional(),
  active_contracts: z.number().optional(),
  beneficiaries: z.number().optional(),
  pending_advances: z.number().optional(),
  expiring_contracts: z.number().optional(),
  orphaned_contracts: z.number().optional(),
  unsubmitted_zatca: z.number().optional(),
}).passthrough();

const aggregatedYoYSchema = z.object({
  prev_fy_id: z.string().nullable().optional(),
  prev_label: z.string().nullable().optional(),
  prev_income: z.number().optional(),
  prev_expenses: z.number().optional(),
  prev_corpus_previous: z.number().optional(),
  prev_vat: z.number().optional(),
  prev_zakat: z.number().optional(),
  prev_net_after_zakat: z.number().optional(),
  prev_has_account: z.boolean().optional(),
  has_prev: z.boolean().optional(),
}).passthrough();

const aggregatedFiscalYearSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  published: z.boolean(),
  created_at: z.string().optional(),
}).passthrough();

/**
 * إعدادات النسب — أرقام nullable (لا نصوص).
 * يكشف مباشرةً أي drift يُرسل النسب كنصوص (مشكلة الـ Record<string,string> السابقة).
 */
const aggregatedSettingsSchema = z.object({
  admin_share_percentage: z.number().nullable().optional(),
  waqif_share_percentage: z.number().nullable().optional(),
  waqf_corpus_percentage: z.number().nullable().optional(),
}).passthrough();

const aggregatedSchema = z.object({
  totals: aggregatedTotalsSchema.optional(),
  collection: aggregatedCollectionSchema.optional(),
  occupancy: aggregatedOccupancySchema.optional(),
  counts: aggregatedCountsSchema.optional(),
  monthly_data: z.array(z.unknown()).optional(),
  expense_types: z.array(z.unknown()).optional(),
  yoy: aggregatedYoYSchema.optional(),
  fiscal_years: z.array(aggregatedFiscalYearSchema).optional(),
  settings: aggregatedSettingsSchema.optional(),
  beneficiaries: z.array(z.unknown()).optional(),
  fiscal_year_id: z.string().optional(),
  fiscal_year_status: z.string().optional(),
  fiscal_year_label: z.string().optional(),
  is_closed: z.boolean().optional(),
}).passthrough();

export const dashboardSummarySchema = z.object({
  aggregated: aggregatedSchema,
  pending_advances: z.array(z.unknown()).default([]),
  fetched_at: z.string().min(1),
});

export type DashboardSummaryResponse = z.infer<typeof dashboardSummarySchema>;
