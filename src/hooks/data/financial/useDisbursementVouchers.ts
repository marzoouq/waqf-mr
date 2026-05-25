/**
 * هوكات سندات الصرف الداخلية (Disbursement Vouchers)
 * - useDisbursementVouchersByExpense: للناظر/المحاسب (وصول كامل + PII)
 * - useDisbursementVouchersPublic: للمستفيد/الواقف (view آمنة بدون PII)
 * - useCreateVoucher / useApproveVoucher / useVoidVoucher / useGenerateVoucherPdf
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
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

interface CreateVoucherInput {
  expense_id: string;
  amount: number;
  recipient_name: string;
  recipient_id_number: string;
  recipient_phone: string;
  payment_method: VoucherPaymentMethod;
  transfer_reference: string;
  work_description: string;
  signature_data: string;
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVoucherInput): Promise<string> => {
      const { data, error } = await supabase.rpc('create_disbursement_voucher', {
        p_expense_id: input.expense_id,
        p_amount: input.amount,
        p_recipient_name: input.recipient_name,
        p_recipient_id_number: input.recipient_id_number,
        p_recipient_phone: input.recipient_phone,
        p_payment_method: input.payment_method,
        p_transfer_reference: input.transfer_reference,
        p_work_description: input.work_description,
        p_signature_data: input.signature_data,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('تم إنشاء سند الصرف كمسودة');
    },
    onError: (e: Error) => {
      logger.error('create_disbursement_voucher failed', e);
      const map: Record<string, string> = {
        EXPENSE_NOT_FOUND: 'المصروف غير موجود',
        EXPENSE_HAS_ACTIVE_VOUCHER: 'يوجد سند صرف نشط لهذا المصروف بالفعل',
        INSUFFICIENT_PRIVILEGES: 'صلاحياتك لا تسمح بإنشاء سند صرف',
      };
      const key = Object.keys(map).find((k) => e.message?.includes(k));
      toast.error(key ? map[key] : (e.message || 'فشل إنشاء سند الصرف'));
    },
  });
}

export function useApproveVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (voucherId: string) => {
      const { error } = await supabase.rpc('approve_disbursement_voucher', {
        p_voucher_id: voucherId,
      });
      if (error) throw error;
      // توليد PDF بعد الاعتماد
      const { error: fnErr } = await supabase.functions.invoke('generate-voucher-pdf', {
        body: { voucher_id: voucherId },
      });
      if (fnErr) logger.warn('generate-voucher-pdf failed (non-blocking)', fnErr);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('تم اعتماد السند وإصدار PDF');
    },
    onError: (e: Error) => {
      logger.error('approve_disbursement_voucher failed', e);
      toast.error(e.message || 'فشل اعتماد السند');
    },
  });
}

export function useVoidVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { voucherId: string; reason: string }) => {
      const { error } = await supabase.rpc('void_disbursement_voucher', {
        p_voucher_id: input.voucherId,
        p_reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('تم إلغاء السند');
    },
    onError: (e: Error) => {
      logger.error('void_disbursement_voucher failed', e);
      toast.error(e.message || 'فشل إلغاء السند');
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
