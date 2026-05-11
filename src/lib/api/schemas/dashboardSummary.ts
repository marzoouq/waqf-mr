/**
 * Zod schema لاستجابة Edge Function `dashboard-summary`.
 *
 * الشكل المرجعي من supabase/functions/dashboard-summary/index.ts:101-106:
 *   { aggregated, pending_advances, fetched_at }
 *
 * `aggregated` يأتي من RPC get_dashboard_full_summary — لا نُكرّر تعريفه هنا
 * (يبقى unknown). القيمة المضافة: التحقق من وجود الحقول الأساسية الثلاثة
 * وكشف drift شكلي (مثلاً غياب fetched_at) قبل أن يتسرّب إلى الواجهة.
 */
import { z } from 'zod';

export const dashboardSummarySchema = z.object({
  aggregated: z.unknown(),
  pending_advances: z.array(z.unknown()).default([]),
  fetched_at: z.string().min(1),
});

export type DashboardSummaryResponse = z.infer<typeof dashboardSummarySchema>;
