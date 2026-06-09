/**
 * useZatcaInvoiceActions — mutations الفواتير (XML + توقيع + إرسال + امتثال) مع تتبع pendingIds
 * بلا أي toast — الإشعارات تُدار في طبقة الصفحة (hooks/page)
 */
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@/lib/api/invoke';
import { zatcaKeys } from '@/lib/queryKeys/zatcaKeys';
import { invoicesKeys } from '@/lib/queryKeys/invoicesKeys';

export function useZatcaInvoiceActions() {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const addPending = (id: string) => setPendingIds(prev => new Set(prev).add(id));
  const removePending = (id: string) => setPendingIds(prev => { const next = new Set(prev); next.delete(id); return next; });

  const invalidateInvoices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.invoices });
    queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.paymentInvoices });
  }, [queryClient]);

  const generateXml = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      return await invoke('zatca-xml-generator', { body: { invoice_id: invoiceId, table } });
    },
    onSuccess: () => { invalidateInvoices(); },
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const signInvoice = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      return await invoke('zatca-signer', { body: { invoice_id: invoiceId, table } });
    },
    onSuccess: () => { invalidateInvoices(); queryClient.invalidateQueries({ queryKey: invoicesKeys.prefixes.invoiceChain }); },
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const submitToZatca = useMutation({
    mutationFn: async ({ invoiceId, table, action }: { invoiceId: string; table: string; action: 'report' | 'clearance' }) => {
      addPending(invoiceId);
      return await invoke('zatca-report', { body: { action, invoice_id: invoiceId, table } });
    },
    onSuccess: () => { invalidateInvoices(); },
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const complianceCheck = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      return await invoke<{ validationResults?: { status?: string } }>('zatca-report', { body: { action: 'compliance-check', invoice_id: invoiceId, table } });
    },
    onSuccess: () => { invalidateInvoices(); },
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  return { pendingIds, generateXml, signInvoice, submitToZatca, complianceCheck };
}
