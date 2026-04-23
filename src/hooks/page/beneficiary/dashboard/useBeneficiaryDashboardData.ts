/**
 * Page hook layer — يعيد تصدير بيانات لوحة المستفيد من طبقة الـ data.
 * تم نقل استدعاء supabase.rpc إلى `hooks/data/dashboard/useBeneficiaryDashboardRpc`
 * التزاماً بـ v7 Layered Architecture (page hooks لا تستدعي supabase مباشرة).
 *
 * #A1 — تم نقل تعريف `BeneficiaryDashboardData` إلى طبقة data
 * (`hooks/data/dashboard/types.ts`) لإصلاح انتهاك اتجاه التبعيات.
 * يُعاد التصدير من هنا للحفاظ على التوافق الخلفي مع المستهلكين.
 */
import { useBeneficiaryDashboardRpc } from '@/hooks/data/dashboard/useBeneficiaryDashboardRpc';
export type { BeneficiaryDashboardData } from '@/hooks/data/dashboard/types';

/**
 * هوك موحّد يجلب جميع بيانات داشبورد المستفيد في استدعاء RPC واحد.
 * يفوّض الجلب الفعلي لطبقة data (`useBeneficiaryDashboardRpc`).
 */
export const useBeneficiaryDashboardData = (fiscalYearId?: string) =>
  useBeneficiaryDashboardRpc(fiscalYearId);
