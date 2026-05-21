/**
 * هوك بيانات لوحة المستخدم النهائي (المستفيد/الواقف) — طبقة application مشتركة بين الأدوار.
 * يفوّض الجلب الفعلي لطبقة data (`useBeneficiaryDashboardRpc`) ويُعيد التصدير
 * تحت اسم محايد للدور لتفادي cross-role coupling عبر barrels.
 *
 * #M6 — استُخرج من `hooks/page/beneficiary/dashboard/useBeneficiaryDashboardData.ts`
 * كي تستهلكه `useWaqifDashboardPage` و`useBeneficiaryDashboardPage` بمصدر واحد.
 */
import { useBeneficiaryDashboardRpc } from '@/hooks/data/dashboard/useBeneficiaryDashboardRpc';
export type { BeneficiaryDashboardData as EndUserDashboardData } from '@/hooks/data/dashboard/types';

export const useEndUserDashboardData = (fiscalYearId?: string) =>
  useBeneficiaryDashboardRpc(fiscalYearId);
