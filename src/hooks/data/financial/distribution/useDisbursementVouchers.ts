/**
 * هوكات استعلام سندات الصرف الداخلية (Disbursement Vouchers) — طبقة data نقية.
 * - useDisbursementVouchersByExpense: للناظر/المحاسب (وصول كامل + PII)
 * - useDisbursementVouchersPublicByExpense: للمستفيد/الواقف (view آمنة بدون PII)
 * - getVoucherSignedUrl: مساعد لإنشاء روابط تنزيل موقّعة
 *
 * Mutations (إنشاء/اعتماد/إلغاء/PDF) في:
 *   @/hooks/page/admin/financial/useVoucherActions
 * — يجب أن تبقى هذه الطبقة بلا toast/UI side-effects.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

export type Voucher = Database['public']['Tables']['disbursement_vouchers']['Row'];
export type VoucherPublic = Database['public']['Views']['disbursement_vouchers_public']['Row'];
export type VoucherPaymentMethod = Database['public']['Enums']['voucher_payment_method'];

const KEY = ['disbursement_vouchers'] as const;

/** قائمة السندات الكاملة (admin/accountant) */
export function useDisbursementVouchersByExpense(expenseId: string | null | undefined) {
  return useQuery({
    queryKey: [...KEY, 'by_expense', expenseId],
    enabled: !!expenseId,
    staleTime: STALE_FINANCIAL,
    queryFn: async (): Promise<Voucher[]> => {
      const { data, error } = await supabase
        .from('disbursement_vouchers')
        .select('*')
        .eq('expense_id', expenseId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

/** النسخة الآمنة (beneficiary/waqif + admin readonly) */
export function useDisbursementVouchersPublicByExpense(expenseId: string | null | undefined) {
  return useQuery({
    queryKey: [...KEY, 'public_by_expense', expenseId],
    enabled: !!expenseId,
    staleTime: STALE_FINANCIAL,
    queryFn: async (): Promise<VoucherPublic[]> => {
      const { data, error } = await supabase
        .from('disbursement_vouchers_public')
        .select('*')
        .eq('expense_id', expenseId!)
        .order('approved_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

/** ينشئ رابط تنزيل موقع لـ PDF المُعتمد */
export async function getVoucherSignedUrl(pdfPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('disbursement-vouchers')
    .createSignedUrl(pdfPath, 60);
  if (error) {
    logger.error('getVoucherSignedUrl failed', error);
    return null;
  }
  return data?.signedUrl || null;
}

