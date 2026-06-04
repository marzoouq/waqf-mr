/**
 * Page-layer hook wrapping voucher mutations with user-facing toasts.
 * يحافظ على hooks/data نقياً (بدون toast/UI side-effects).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { rpc } from '@/lib/api/rpc';
import { invoke } from '@/lib/api/invoke';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type VoucherPaymentMethod = Database['public']['Enums']['voucher_payment_method'];

const KEY = ['disbursement_vouchers'] as const;

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

const CREATE_ERR_MAP: Record<string, string> = {
  EXPENSE_NOT_FOUND: 'المصروف غير موجود',
  EXPENSE_HAS_ACTIVE_VOUCHER: 'يوجد سند صرف نشط لهذا المصروف بالفعل',
  INSUFFICIENT_PRIVILEGES: 'صلاحياتك لا تسمح بإنشاء سند صرف',
};

export function useCreateVoucherAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVoucherInput): Promise<string> => {
      const data = await rpc<string>('create_disbursement_voucher', {
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
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('تم إنشاء سند الصرف كمسودة');
    },
    onError: (e: Error) => {
      logger.error('create_disbursement_voucher failed', e);
      const key = Object.keys(CREATE_ERR_MAP).find((k) => e.message?.includes(k));
      toast.error(key ? CREATE_ERR_MAP[key] : (e.message || 'فشل إنشاء سند الصرف'));
    },
  });
}

export function useApproveVoucherAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (voucherId: string) => {
      await rpc('approve_disbursement_voucher', { p_voucher_id: voucherId });
      let pdfOk = true;
      let fnErr: unknown = null;
      try {
        await invoke('generate-voucher-pdf', { body: { voucher_id: voucherId } });
      } catch (err) {
        pdfOk = false;
        fnErr = err;
      }
      return { pdfOk, fnErr };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY });
      if (res.pdfOk) {
        toast.success('تم اعتماد السند وإصدار PDF');
      } else {
        logger.warn('generate-voucher-pdf failed (non-blocking)', res.fnErr);
        toast.warning('تم اعتماد السند، لكن تعذّر إصدار PDF — استخدم زر "إصدار PDF" لإعادة المحاولة');
      }
    },
    onError: (e: Error) => {
      logger.error('approve_disbursement_voucher failed', e);
      toast.error(e.message || 'فشل اعتماد السند');
    },
  });
}

export function useGenerateVoucherPdfAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (voucherId: string) => {
      await invoke('generate-voucher-pdf', { body: { voucher_id: voucherId } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('تم إصدار PDF بنجاح');
    },
    onError: (e: Error) => {
      logger.error('generate-voucher-pdf failed', e);
      toast.error('تعذّر إصدار PDF — راجع السجلات');
    },
  });
}

export function useVoidVoucherAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { voucherId: string; reason: string }) => {
      await rpc('void_disbursement_voucher', {
        p_voucher_id: input.voucherId,
        p_reason: input.reason,
      });
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
