/**
 * useZatcaInvoiceActions — كل mutations الفواتير (XML + توقيع + إرسال + امتثال) مع تتبع pendingIds
 */
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@/lib/api/invoke';
import { uiNotify } from '@/lib/notify';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';

export function useZatcaInvoiceActions() {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const addPending = (id: string) => setPendingIds(prev => new Set(prev).add(id));
  const removePending = (id: string) => setPendingIds(prev => { const next = new Set(prev); next.delete(id); return next; });

  const invalidateInvoices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['zatca-payment-invoices'] });
  }, [queryClient]);

  const generateXml = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      return await invoke('zatca-xml-generator', { body: { invoice_id: invoiceId, table } });
    },
    onSuccess: () => { uiNotify.success('تم توليد XML بنجاح'); invalidateInvoices(); },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const signInvoice = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      return await invoke('zatca-signer', { body: { invoice_id: invoiceId, table } });
    },
    onSuccess: () => { uiNotify.success('تم التوقيع بنجاح'); invalidateInvoices(); queryClient.invalidateQueries({ queryKey: ['invoice-chain'] }); },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const submitToZatca = useMutation({
    mutationFn: async ({ invoiceId, table, action }: { invoiceId: string; table: string; action: 'report' | 'clearance' }) => {
      addPending(invoiceId);
      return await invoke('zatca-report', { body: { action, invoice_id: invoiceId, table } });
    },
    onSuccess: () => { uiNotify.success('تم الإرسال لـ ZATCA'); invalidateInvoices(); },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const complianceCheck = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      return await invoke<{ validationResults?: { status?: string } }>('zatca-report', { body: { action: 'compliance-check', invoice_id: invoiceId, table } });
    },
    onSuccess: (data) => {
      if (data?.validationResults?.status === 'PASS') uiNotify.success('✅ اجتاز فحص الامتثال');
      else if (data?.validationResults?.status === 'WARNING') uiNotify.warning('⚠️ اجتاز مع تحذيرات');
      else uiNotify.error('❌ لم يجتز فحص الامتثال');
      invalidateInvoices();
    },
    onError: (e: Error) => uiNotify.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  return { pendingIds, generateXml, signInvoice, submitToZatca, complianceCheck };
}
