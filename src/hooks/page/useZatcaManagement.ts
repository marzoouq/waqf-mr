/**
 * هوك إدارة بيانات ومنطق ZATCA — استخراج من ZatcaManagementPage
 */
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { logger } from '@/lib/logger';
import { STALE_FINANCIAL, STALE_STATIC } from '@/lib/queryStaleTime';
import { useFiscalYear } from '@/contexts/FiscalYearContext';

const INVOICES_PER_PAGE = 20;

export function useZatcaManagement() {
  const { fiscalYearId } = useFiscalYear();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [productionLoading, setProductionLoading] = useState(false);
  const [invoicePage, setInvoicePage] = useState(1);

  // ─── Required Settings ───
  const { data: zatcaSettings } = useQuery({
    queryKey: ['zatca-required-settings'],
    staleTime: STALE_STATIC,
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('key, value')
        .in('key', ['waqf_name', 'vat_registration_number', 'zatca_device_serial']);
      const map: Record<string, string> = {};
      (data || []).forEach(s => { map[s.key] = s.value; });
      return map;
    },
  });

  const missingSettings = [
    ...(!zatcaSettings?.zatca_device_serial ? ['الرقم التسلسلي للجهاز'] : []),
    ...(!zatcaSettings?.vat_registration_number ? ['الرقم الضريبي'] : []),
    ...(!zatcaSettings?.waqf_name ? ['اسم المنشأة'] : []),
  ];
  const canOnboard = missingSettings.length === 0;

  // ─── Certificates ───
  const { data: certificates = [], isLoading: certsLoading } = useQuery({
    queryKey: ['zatca-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('zatca_certificates').select('id, certificate_type, is_active, request_id, created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ─── Invoices ───
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['zatca-invoices', statusFilter, fiscalYearId],
    queryFn: async () => {
      let q = supabase.from('invoices').select('id, invoice_number, invoice_type, amount, vat_amount, vat_rate, date, zatca_status, zatca_uuid, zatca_xml, invoice_hash, icv, fiscal_year_id').order('date', { ascending: false }).limit(1000);
      if (statusFilter !== 'all') q = q.eq('zatca_status', statusFilter);
      if (fiscalYearId && fiscalYearId !== 'all') q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(i => ({ ...i, source: 'invoices' as const }));
    },
  });

  const { data: paymentInvoices = [] } = useQuery({
    queryKey: ['zatca-payment-invoices', statusFilter, fiscalYearId],
    queryFn: async () => {
      let q = supabase.from('payment_invoices').select('id, invoice_number, amount, vat_amount, vat_rate, due_date, zatca_status, zatca_uuid, zatca_xml, invoice_hash, icv, invoice_type, fiscal_year_id').order('due_date', { ascending: false }).limit(1000);
      if (statusFilter !== 'all') q = q.eq('zatca_status', statusFilter);
      if (fiscalYearId && fiscalYearId !== 'all') q = q.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(i => ({ ...i, source: 'payment_invoices' as const, date: i.due_date }));
    },
  });

  const allInvoices = useMemo(() => [...invoices, ...paymentInvoices], [invoices, paymentInvoices]);
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * INVOICES_PER_PAGE;
    return allInvoices.slice(start, start + INVOICES_PER_PAGE);
  }, [allInvoices, invoicePage]);

  // ─── Chain ───
  const { data: chain = [], isLoading: chainLoading } = useQuery({
    queryKey: ['invoice-chain'],
    queryFn: async () => {
      const limit = 1000;
      const { data, error } = await supabase.from('invoice_chain').select('id, invoice_id, icv, previous_hash, invoice_hash, source_table, created_at').order('icv', { ascending: false }).limit(limit);
      if (error) throw error;
      if (data && data.length >= limit) {
        logger.warn(`invoice_chain query hit limit (${limit})`);
        toast.warning('تم الوصول للحد الأقصى (1000 سجل) — قد تكون هناك سجلات سلسلة إضافية غير معروضة');
      } else if (data && data.length >= 900) {
        logger.warn(`invoice_chain approaching limit: ${data.length}/${limit}`);
        toast.info(`عدد سجلات السلسلة (${data.length}) يقترب من الحد الأقصى (1000)`);
      }
      return data;
    },
  });

  // ─── Mutations ───
  const invalidateInvoices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['zatca-payment-invoices'] });
  }, [queryClient]);

  const addPending = (id: string) => setPendingIds(prev => new Set(prev).add(id));
  const removePending = (id: string) => setPendingIds(prev => { const next = new Set(prev); next.delete(id); return next; });

  const generateXml = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      const { data, error } = await supabase.functions.invoke('zatca-xml-generator', { body: { invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('تم توليد XML بنجاح'); invalidateInvoices(); },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const signInvoice = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      addPending(invoiceId);
      const { data, error } = await supabase.functions.invoke('zatca-signer', { body: { invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('تم التوقيع بنجاح'); invalidateInvoices(); queryClient.invalidateQueries({ queryKey: ['invoice-chain'] }); },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const submitToZatca = useMutation({
    mutationFn: async ({ invoiceId, table, action }: { invoiceId: string; table: string; action: 'report' | 'clearance' }) => {
      addPending(invoiceId);
      const { data, error } = await supabase.functions.invoke('zatca-report', { body: { action, invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('تم الإرسال لـ ZATCA'); invalidateInvoices(); },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
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
      if (data?.validationResults?.status === 'PASS') toast.success('✅ اجتاز فحص الامتثال');
      else if (data?.validationResults?.status === 'WARNING') toast.warning('⚠️ اجتاز مع تحذيرات');
      else toast.error('❌ لم يجتز فحص الامتثال');
      invalidateInvoices();
      return data;
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: (_d, _e, vars) => removePending(vars.invoiceId),
  });

  const handleOnboard = useCallback(async () => {
    setOnboardLoading(true);
    try {
      const { error } = await supabase.functions.invoke('zatca-onboard', { body: { action: 'onboard' } });
      if (error) throw error;
      toast.success('تم إرسال طلب التسجيل');
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التسجيل');
    } finally {
      setOnboardLoading(false);
    }
  }, [queryClient]);

  const handleProductionUpgrade = useCallback(async () => {
    setProductionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('zatca-onboard', { body: { action: 'production' } });
      if (error) throw error;
      toast.success('✅ تمت الترقية لشهادة الإنتاج بنجاح');
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشلت الترقية للإنتاج');
    } finally {
      setProductionLoading(false);
    }
  }, [queryClient]);

  // ─── Derived ───
  const submitted = allInvoices.filter(i => ['submitted', 'reported', 'cleared', 'compliance_passed'].includes(i.zatca_status || '')).length;
  const pending = allInvoices.filter(i => i.zatca_status === 'not_submitted' || !i.zatca_status).length;
  const rejected = allInvoices.filter(i => i.zatca_status === 'rejected').length;
  const activeCert = certificates.find(c => c.is_active);
  const isComplianceCert = activeCert?.certificate_type === 'compliance';
  const isProductionCert = activeCert?.certificate_type === 'production';

  return {
    // بيانات
    certificates, certsLoading, allInvoices, paginatedInvoices, invoicesLoading,
    chain, chainLoading, activeCert, isComplianceCert, isProductionCert,
    // إحصائيات
    submitted, pending, rejected,
    // حالة UI
    statusFilter, setStatusFilter, invoicePage, setInvoicePage,
    pendingIds, onboardLoading, productionLoading,
    canOnboard, missingSettings,
    // إجراءات
    generateXml, signInvoice, submitToZatca, complianceCheck,
    handleOnboard, handleProductionUpgrade,
    // ثوابت
    INVOICES_PER_PAGE,
  };
}
