/**
 * useZatcaInvoiceActions — كل mutations الفواتير (XML + توقيع + إرسال + امتثال) مع تتبع pendingIds
 */
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
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
      const { data, error } = await supabase.functions.invoke('zatca-xml-generator', { body: { invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { defaultNotify.success('تم توليد XML بنجاح'); invalidateInvoices(); },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const signInvoice = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      const { data, error } = await supabase.functions.invoke('zatca-signer', { body: { invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { defaultNotify.success('تم التوقيع بنجاح'); invalidateInvoices(); queryClient.invalidateQueries({ queryKey: ['invoice-chain'] }); },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const submitToZatca = useMutation({
    mutationFn: async ({ invoiceId, table, action }: { invoiceId: string; table: string; action: 'report' | 'clearance' }) => {
      addPending(invoiceId);
      const { data, error } = await supabase.functions.invoke('zatca-report', { body: { action, invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { defaultNotify.success('تم الإرسال لـ ZATCA'); invalidateInvoices(); },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const complianceCheck = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      const { data, error } = await supabase.functions.invoke('zatca-report', { body: { action: 'compliance-check', invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.validationResults?.status === 'PASS') defaultNotify.success('✅ اجتاز فحص الامتثال');
      else if (data?.validationResults?.status === 'WARNING') defaultNotify.warning('⚠️ اجتاز مع تحذيرات');
      else defaultNotify.error('❌ لم يجتز فحص الامتثال');
      invalidateInvoices();
    },
    onError: (e: Error) => defaultNotify.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  return { pendingIds, generateXml, signInvoice, submitToZatca, complianceCheck };
}
