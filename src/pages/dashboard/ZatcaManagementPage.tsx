/**
 * صفحة إدارة ZATCA — Orchestrator
 * يحتوي على الـ hooks والـ state ويمرر البيانات للمكونات الفرعية
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { ShieldCheck, FileText, Link2 } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { useState, useMemo } from 'react';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import InvoiceStepsGuide from '@/components/invoices/InvoiceStepsGuide';

import ZatcaSummaryCards from '@/components/zatca/ZatcaSummaryCards';
import ZatcaInvoicesTab from '@/components/zatca/ZatcaInvoicesTab';
import ZatcaCertificatesTab from '@/components/zatca/ZatcaCertificatesTab';
import ZatcaChainTab from '@/components/zatca/ZatcaChainTab';
import ZatcaComplianceDialog from '@/components/zatca/ZatcaComplianceDialog';

interface ComplianceMessage {
  code: string;
  message: string;
}

interface ComplianceResult {
  warningMessages?: ComplianceMessage[];
  errorMessages?: ComplianceMessage[];
  infoMessages?: ComplianceMessage[];
  validationResults?: {
    status?: string;
    warningMessages?: ComplianceMessage[];
    errorMessages?: ComplianceMessage[];
    infoMessages?: ComplianceMessage[];
  };
}

function ZatcaManagementPage() {
  const { fiscalYearId } = useFiscalYear();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pendingAction, setPendingAction] = useState<{ id: string; type: string } | null>(null);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [productionLoading, setProductionLoading] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [invoicePage, setInvoicePage] = useState(1);
  const INVOICES_PER_PAGE = 20;

  // ─── Required Settings ───
  const { data: zatcaSettings } = useQuery({
    queryKey: ['zatca-required-settings'],
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
      let q = supabase.from('invoices').select('id, invoice_number, invoice_type, amount, vat_amount, vat_rate, date, zatca_status, zatca_uuid, zatca_xml, invoice_hash, icv, fiscal_year_id').order('date', { ascending: false }).limit(200);
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
      let q = supabase.from('payment_invoices').select('id, invoice_number, amount, vat_amount, vat_rate, due_date, zatca_status, zatca_uuid, zatca_xml, invoice_hash, icv, invoice_type, fiscal_year_id').order('due_date', { ascending: false }).limit(200);
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
      const { data, error } = await supabase.from('invoice_chain').select('*').order('icv', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  // ─── Mutations ───
  const invalidateInvoices = () => {
    queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['zatca-payment-invoices'] });
  };

  const generateXml = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      setPendingAction({ id: invoiceId, type: 'xml' });
      const { data, error } = await supabase.functions.invoke('zatca-xml-generator', { body: { invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('تم توليد XML بنجاح'); invalidateInvoices(); },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: () => setPendingAction(null),
  });

  const signInvoice = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      setPendingAction({ id: invoiceId, type: 'sign' });
      const { data, error } = await supabase.functions.invoke('zatca-signer', { body: { invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('تم التوقيع بنجاح'); invalidateInvoices(); queryClient.invalidateQueries({ queryKey: ['invoice-chain'] }); },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: () => setPendingAction(null),
  });

  const submitToZatca = useMutation({
    mutationFn: async ({ invoiceId, table, action }: { invoiceId: string; table: string; action: 'report' | 'clearance' }) => {
      setPendingAction({ id: invoiceId, type: 'submit' });
      const { data, error } = await supabase.functions.invoke('zatca-api', { body: { action, invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success('تم الإرسال لـ ZATCA'); invalidateInvoices(); },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: () => setPendingAction(null),
  });

  const complianceCheck = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      setPendingAction({ id: invoiceId, type: 'compliance' });
      const { data, error } = await supabase.functions.invoke('zatca-api', { body: { action: 'compliance-check', invoice_id: invoiceId, table } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.validationResults?.status === 'PASS') toast.success('✅ اجتاز فحص الامتثال');
      else if (data?.validationResults?.status === 'WARNING') toast.warning('⚠️ اجتاز مع تحذيرات');
      else toast.error('❌ لم يجتز فحص الامتثال');
      setComplianceResult(data);
      invalidateInvoices();
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: () => setPendingAction(null),
  });

  const handleOnboard = async () => {
    setOnboardLoading(true);
    try {
      const { error } = await supabase.functions.invoke('zatca-api', { body: { action: 'onboard' } });
      if (error) throw error;
      toast.success('تم إرسال طلب التسجيل');
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التسجيل');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleProductionUpgrade = async () => {
    setProductionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('zatca-api', { body: { action: 'production' } });
      if (error) throw error;
      toast.success('✅ تمت الترقية لشهادة الإنتاج بنجاح');
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشلت الترقية للإنتاج');
    } finally {
      setProductionLoading(false);
    }
  };

  // ─── Derived ───
  const submitted = allInvoices.filter(i => ['submitted', 'reported', 'cleared', 'compliance_passed'].includes(i.zatca_status || '')).length;
  const pending = allInvoices.filter(i => i.zatca_status === 'not_submitted' || !i.zatca_status).length;
  const rejected = allInvoices.filter(i => i.zatca_status === 'rejected').length;
  const activeCert = certificates.find(c => c.is_active);
  const isComplianceCert = activeCert?.certificate_type === 'compliance';
  const isProductionCert = activeCert?.certificate_type === 'production';

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard title="إدارة ZATCA" icon={ShieldCheck} description="إدارة الشهادات والفواتير الضريبية وسلسلة التوقيع" />
        <InvoiceStepsGuide />

        <ZatcaSummaryCards
          submitted={submitted}
          pending={pending}
          rejected={rejected}
          activeCertType={activeCert ? (isProductionCert ? 'production' : 'compliance') : null}
        />

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices"><FileText className="w-4 h-4 ml-1" />الفواتير</TabsTrigger>
            <TabsTrigger value="certificates"><ShieldCheck className="w-4 h-4 ml-1" />الشهادات</TabsTrigger>
            <TabsTrigger value="chain"><Link2 className="w-4 h-4 ml-1" />سلسلة التوقيع</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <ZatcaInvoicesTab
              allInvoices={allInvoices}
              paginatedInvoices={paginatedInvoices}
              invoicesLoading={invoicesLoading}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              invoicePage={invoicePage}
              setInvoicePage={setInvoicePage}
              itemsPerPage={INVOICES_PER_PAGE}
              isComplianceCert={isComplianceCert}
              isProductionCert={isProductionCert}
              pendingAction={pendingAction}
              onGenerateXml={(id, table) => generateXml.mutate({ invoiceId: id, table })}
              onSignInvoice={(id, table) => signInvoice.mutate({ invoiceId: id, table })}
              onSubmitToZatca={(id, table, action) => submitToZatca.mutate({ invoiceId: id, table, action })}
              onComplianceCheck={(id, table) => complianceCheck.mutate({ invoiceId: id, table })}
            />
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <ZatcaCertificatesTab
              certificates={certificates}
              certsLoading={certsLoading}
              isComplianceCert={isComplianceCert}
              isProductionCert={isProductionCert}
              activeCert={activeCert}
              canOnboard={canOnboard}
              missingSettings={missingSettings}
              onboardLoading={onboardLoading}
              productionLoading={productionLoading}
              onOnboard={handleOnboard}
              onProductionUpgrade={handleProductionUpgrade}
            />
          </TabsContent>

          <TabsContent value="chain" className="space-y-4">
            <ZatcaChainTab chain={chain} chainLoading={chainLoading} />
          </TabsContent>
        </Tabs>
      </div>

      <ZatcaComplianceDialog result={complianceResult} onClose={() => setComplianceResult(null)} />
    </DashboardLayout>
  );
}

export default ZatcaManagementPage;
