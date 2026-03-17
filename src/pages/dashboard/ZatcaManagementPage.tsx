/**
 * صفحة إدارة ZATCA — الشهادات، حالة الفواتير، سلسلة التوقيع
 */
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { ShieldCheck, FileText, Link2, RefreshCw, Send, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, FileCode, PenTool, ArrowUpCircle, ClipboardCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PageHeaderCard from '@/components/PageHeaderCard';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import TablePagination from '@/components/TablePagination';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import InvoiceStepsGuide from '@/components/invoices/InvoiceStepsGuide';

const ZATCA_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_submitted: { label: 'لم تُرسل', variant: 'outline' },
  pending: { label: 'قيد المعالجة', variant: 'secondary' },
  submitted: { label: 'مُرسلة', variant: 'default' },
  reported: { label: 'تم الإبلاغ', variant: 'default' },
  cleared: { label: 'مُعتمدة', variant: 'default' },
  rejected: { label: 'مرفوضة', variant: 'destructive' },
  compliance_passed: { label: 'اجتاز الفحص', variant: 'default' },
};

function ZatcaManagementPage() {
  const { fiscalYearId } = useFiscalYear();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pendingAction, setPendingAction] = useState<{ id: string; type: string } | null>(null);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [productionLoading, setProductionLoading] = useState(false);
  const [complianceResult, setComplianceResult] = useState<any>(null);
  const [invoicePage, setInvoicePage] = useState(1);
  const INVOICES_PER_PAGE = 20;

  // ─── Required Settings for Onboarding ───
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

  // ─── Invoices (both tables) ───
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

  const allInvoices = [...invoices, ...paymentInvoices];
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * INVOICES_PER_PAGE;
    return allInvoices.slice(start, start + INVOICES_PER_PAGE);
  }, [allInvoices, invoicePage]);

  // ─── Invoice Chain ───
  const { data: chain = [], isLoading: chainLoading } = useQuery({
    queryKey: ['invoice-chain'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoice_chain').select('*').order('icv', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  // ─── Generate XML ───
  const generateXml = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      setPendingAction({ id: invoiceId, type: 'xml' });
      const { data, error } = await supabase.functions.invoke('zatca-xml-generator', {
        body: { invoice_id: invoiceId, table },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم توليد XML بنجاح');
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-payment-invoices'] });
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: () => setPendingAction(null),
  });

  // ─── Sign Invoice ───
  const signInvoice = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      setPendingAction({ id: invoiceId, type: 'sign' });
      const { data, error } = await supabase.functions.invoke('zatca-signer', {
        body: { invoice_id: invoiceId, table },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم التوقيع بنجاح');
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-payment-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-chain'] });
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: () => setPendingAction(null),
  });

  // ─── Report / Clearance ───
  const submitToZatca = useMutation({
    mutationFn: async ({ invoiceId, table, action }: { invoiceId: string; table: string; action: 'report' | 'clearance' }) => {
      setPendingAction({ id: invoiceId, type: 'submit' });
      const { data, error } = await supabase.functions.invoke('zatca-api', {
        body: { action, invoice_id: invoiceId, table },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم الإرسال لـ ZATCA');
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-payment-invoices'] });
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: () => setPendingAction(null),
  });

  // ─── Compliance Check ───
  const complianceCheck = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      setPendingAction({ id: invoiceId, type: 'compliance' });
      const { data, error } = await supabase.functions.invoke('zatca-api', {
        body: { action: 'compliance-check', invoice_id: invoiceId, table },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.validationResults?.status === 'PASS') {
        toast.success('✅ اجتاز فحص الامتثال');
      } else if (data?.validationResults?.status === 'WARNING') {
        toast.warning('⚠️ اجتاز مع تحذيرات');
      } else {
        toast.error('❌ لم يجتز فحص الامتثال');
      }
      setComplianceResult(data);
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['zatca-payment-invoices'] });
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e)),
    onSettled: () => setPendingAction(null),
  });

  // ─── Onboarding ───
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

  // ─── Production Upgrade ───
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

  // ─── Summary ───
  const submitted = allInvoices.filter(i => ['submitted', 'reported', 'cleared', 'compliance_passed'].includes(i.zatca_status || '')).length;
  const pending = allInvoices.filter(i => i.zatca_status === 'not_submitted' || !i.zatca_status).length;
  const rejected = allInvoices.filter(i => i.zatca_status === 'rejected').length;
  const activeCert = certificates.find(c => c.is_active);
  const isComplianceCert = activeCert?.certificate_type === 'compliance';
  const isProductionCert = activeCert?.certificate_type === 'production';

  const isRowPending = (invoiceId: string) => pendingAction?.id === invoiceId;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeaderCard
          title="إدارة ZATCA"
          icon={ShieldCheck}
          description="إدارة الشهادات والفواتير الضريبية وسلسلة التوقيع"
        />

        <InvoiceStepsGuide />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{submitted}</p>
              <p className="text-sm text-muted-foreground">مُرسلة / مُعتمدة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="w-8 h-8 mx-auto text-accent-foreground mb-2" />
              <p className="text-2xl font-bold text-foreground">{pending}</p>
              <p className="text-sm text-muted-foreground">لم تُرسل</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <XCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
              <p className="text-2xl font-bold text-foreground">{rejected}</p>
              <p className="text-sm text-muted-foreground">مرفوضة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <ShieldCheck className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-bold text-foreground">
                {activeCert ? (isProductionCert ? 'إنتاج' : 'امتثال') : 'غير مسجّل'}
              </p>
              <p className="text-sm text-muted-foreground">حالة الشهادة</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices"><FileText className="w-4 h-4 ml-1" />الفواتير</TabsTrigger>
            <TabsTrigger value="certificates"><ShieldCheck className="w-4 h-4 ml-1" />الشهادات</TabsTrigger>
            <TabsTrigger value="chain"><Link2 className="w-4 h-4 ml-1" />سلسلة التوقيع</TabsTrigger>
          </TabsList>

          {/* ─── Invoices Tab ─── */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setInvoicePage(1); }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="فلتر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="not_submitted">لم تُرسل</SelectItem>
                  <SelectItem value="submitted">مُرسلة</SelectItem>
                  <SelectItem value="reported">تم الإبلاغ</SelectItem>
                  <SelectItem value="cleared">مُعتمدة</SelectItem>
                  <SelectItem value="rejected">مرفوضة</SelectItem>
                </SelectContent>
              </Select>
              {isComplianceCert && (
                <Badge variant="secondary" className="gap-1">
                  <ClipboardCheck className="w-3 h-3" />
                  وضع فحص الامتثال
                </Badge>
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الضريبة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>خطوات ZATCA</TableHead>
                      <TableHead>حالة ZATCA</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell></TableRow>
                    ) : allInvoices.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد فواتير</TableCell></TableRow>
                    ) : paginatedInvoices.map(inv => {
                      const status = ZATCA_STATUS_MAP[inv.zatca_status || 'not_submitted'] || ZATCA_STATUS_MAP.not_submitted;
                      const rowBusy = isRowPending(inv.id);
                      const isSubmitted = ['submitted', 'reported', 'cleared', 'compliance_passed'].includes(inv.zatca_status || '');

                      const hasXml = !!inv.zatca_xml;
                      const hasSig = !!inv.invoice_hash;
                      const canSign = hasXml && !hasSig;
                      const canSubmit = hasXml && hasSig && !isSubmitted;
                      const canComplianceCheck = hasXml && hasSig && !isSubmitted && isComplianceCert;

                      return (
                        <TableRow key={inv.id} className={rowBusy ? 'opacity-60' : ''}>
                          <TableCell className="font-mono text-sm">{inv.invoice_number || '—'}</TableCell>
                          <TableCell>{Number(inv.amount).toLocaleString()} ر.س</TableCell>
                          <TableCell>{Number(inv.vat_amount).toLocaleString()} ({inv.vat_rate}%)</TableCell>
                          <TableCell>{inv.date}</TableCell>
                          {/* Step indicators */}
                          <TableCell>
                            <TooltipProvider delayDuration={200}>
                              <div className="flex items-center gap-1.5">
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${hasXml ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{hasXml ? 'XML مُوّلد ✓' : 'XML غير مُوّلد'}</TooltipContent>
                                </Tooltip>
                                <span className={`w-4 h-0.5 ${hasXml ? 'bg-primary' : 'bg-muted'}`} />
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${hasSig ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{hasSig ? 'موقّع ✓' : 'غير موقّع'}</TooltipContent>
                                </Tooltip>
                                <span className={`w-4 h-0.5 ${isSubmitted ? 'bg-primary' : 'bg-muted'}`} />
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isSubmitted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{isSubmitted ? 'مُرسل ✓' : 'لم يُرسل'}</TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {/* Step 1: Generate XML */}
                              {!isSubmitted && (
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={hasXml ? 'ghost' : 'outline'}
                                        onClick={() => generateXml.mutate({ invoiceId: inv.id, table: inv.source })}
                                        disabled={rowBusy || hasSig}
                                      >
                                        {rowBusy && pendingAction?.type === 'xml' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCode className="w-3 h-3" />}
                                        <span className="mr-1 text-xs">XML</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{hasSig ? 'لا يمكن إعادة توليد XML بعد التوقيع' : hasXml ? 'إعادة توليد XML' : 'توليد XML'}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Step 2: Sign */}
                              {!isSubmitted && (
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={hasSig ? 'ghost' : 'outline'}
                                        onClick={() => signInvoice.mutate({ invoiceId: inv.id, table: inv.source })}
                                        disabled={rowBusy || !canSign}
                                      >
                                        {rowBusy && pendingAction?.type === 'sign' ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenTool className="w-3 h-3" />}
                                        <span className="mr-1 text-xs">توقيع</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{!hasXml ? 'يجب توليد XML أولاً' : hasSig ? 'موقّعة مسبقاً' : 'توقيع الفاتورة'}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Compliance Check — only with compliance cert */}
                              {canComplianceCheck && (
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => complianceCheck.mutate({ invoiceId: inv.id, table: inv.source })}
                                        disabled={rowBusy}
                                      >
                                        {rowBusy && pendingAction?.type === 'compliance' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardCheck className="w-3 h-3" />}
                                        <span className="mr-1 text-xs">فحص</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>فحص امتثال الفاتورة عبر بوابة ZATCA</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Step 3: Submit — only with production cert */}
                              {!isSubmitted && isProductionCert && (
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          // تحديد الإجراء تلقائياً: standard → clearance, simplified → report
                                          const invoiceType = inv.invoice_type || '';
                                          const autoAction = invoiceType === 'standard' ? 'clearance' : 'report';
                                          submitToZatca.mutate({ invoiceId: inv.id, table: inv.source, action: autoAction });
                                        }}
                                        disabled={rowBusy || !canSubmit}
                                      >
                                        {rowBusy && pendingAction?.type === 'submit' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                        <span className="mr-1 text-xs">إرسال</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{!hasXml ? 'يجب توليد XML أولاً' : !hasSig ? 'يجب التوقيع أولاً' : 'إرسال إلى ZATCA'}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {/* Re-submit for rejected */}
                              {inv.zatca_status === 'rejected' && isProductionCert && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    const invoiceType = inv.invoice_type || '';
                                    const autoAction = invoiceType === 'standard' ? 'clearance' : 'report';
                                    submitToZatca.mutate({ invoiceId: inv.id, table: inv.source, action: autoAction });
                                  }}
                                  disabled={rowBusy}
                                >
                                  {rowBusy ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <RefreshCw className="w-3 h-3 ml-1" />}
                                  إعادة إرسال
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
              <TablePagination currentPage={invoicePage} totalItems={allInvoices.length} itemsPerPage={INVOICES_PER_PAGE} onPageChange={setInvoicePage} />
            </Card>
          </TabsContent>

          {/* ─── Certificates Tab ─── */}
          <TabsContent value="certificates" className="space-y-4">
            {/* Workflow Stepper */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">دورة العمل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {/* Step 1: Onboarding */}
                  <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${activeCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-sm font-medium">١. التسجيل</span>
                    {activeCert && <CheckCircle className="w-3 h-3" />}
                  </div>
                  <span className="text-muted-foreground">←</span>
                  {/* Step 2: Compliance Check */}
                  <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${isComplianceCert ? 'bg-secondary border-primary text-secondary-foreground' : isProductionCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                    <ClipboardCheck className="w-4 h-4" />
                    <span className="text-sm font-medium">٢. فحص الامتثال</span>
                    {isProductionCert && <CheckCircle className="w-3 h-3" />}
                  </div>
                  <span className="text-muted-foreground">←</span>
                  {/* Step 3: Production */}
                  <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${isProductionCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                    <ArrowUpCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">٣. الإنتاج</span>
                    {isProductionCert && <CheckCircle className="w-3 h-3" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  شهادات ZATCA
                </CardTitle>
              </CardHeader>
              <CardContent>
                {certsLoading ? (
                  <p className="text-muted-foreground text-center py-8">جارٍ التحميل...</p>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <AlertTriangle className="w-12 h-12 mx-auto text-accent-foreground" />
                    <p className="text-muted-foreground">لا توجد شهادات مسجّلة</p>
                    <p className="text-sm text-muted-foreground">يجب التسجيل في بوابة فاتورة أولاً للحصول على CSID</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button disabled={onboardLoading || !canOnboard}>
                          {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                          بدء التسجيل (Onboarding)
                        </Button>
                      </AlertDialogTrigger>
                      {!canOnboard && (
                        <p className="text-sm text-destructive mt-2">
                          <AlertTriangle className="w-4 h-4 inline ml-1" />
                          يجب تعيين الإعدادات التالية أولاً: {missingSettings.join('، ')}
                        </p>
                      )}
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>⚠️ تسجيل شهادة ZATCA جديدة</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-2">
                            <p>سيتم إنشاء شهادة ZATCA جديدة. إذا كانت هناك شهادة نشطة سابقة، سيتم إلغاؤها تلقائياً.</p>
                            <p className="text-destructive font-medium">هذه العملية لا يمكن التراجع عنها وقد تتطلب إعادة تسجيل كامل في بوابة فاتورة.</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={handleOnboard}>تأكيد التسجيل</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>النوع</TableHead>
                          <TableHead>حالة</TableHead>
                          <TableHead>معرّف الطلب</TableHead>
                          <TableHead>تاريخ الإنشاء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {certificates.map(cert => (
                          <TableRow key={cert.id}>
                            <TableCell>
                              <Badge variant={cert.certificate_type === 'production' ? 'default' : 'secondary'}>
                                {cert.certificate_type === 'production' ? 'إنتاج' : 'امتثال'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={cert.is_active ? 'default' : 'outline'}>
                                {cert.is_active ? 'نشطة' : 'غير نشطة'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{cert.request_id || '—'}</TableCell>
                            <TableCell>{cert.created_at ? new Date(cert.created_at).toLocaleDateString('ar-SA') : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {!canOnboard && (
                        <p className="text-sm text-destructive w-full">
                          <AlertTriangle className="w-4 h-4 inline ml-1" />
                          يجب تعيين الإعدادات التالية قبل التسجيل: {missingSettings.join('، ')}
                        </p>
                      )}
                      {/* Re-onboard */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" disabled={onboardLoading || !canOnboard}>
                            {onboardLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            إعادة التسجيل
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>⚠️ إعادة تسجيل شهادة ZATCA</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <p>سيتم إلغاء الشهادة النشطة الحالية وإنشاء شهادة جديدة.</p>
                              <p className="text-destructive font-medium">هل أنت متأكد؟ هذا قد يؤثر على الفواتير المعلقة.</p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleOnboard}>تأكيد إعادة التسجيل</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Production Upgrade — only when compliance cert is active */}
                      {isComplianceCert && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" disabled={productionLoading} className="gap-1">
                              {productionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                              ترقية للإنتاج
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ترقية إلى شهادة الإنتاج</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <p>سيتم ترقية شهادة الامتثال الحالية إلى شهادة إنتاج.</p>
                                <p className="font-medium">تأكد من أنك أجريت فحص الامتثال بنجاح على 6 فواتير اختبار قبل الترقية.</p>
                                <p className="text-destructive font-medium">بعد الترقية، ستُرسل الفواتير فعلياً إلى هيئة الزكاة والضريبة.</p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={handleProductionUpgrade}>تأكيد الترقية</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Chain Tab ─── */}
          <TabsContent value="chain" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  سلسلة التوقيع (Invoice Chain)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chainLoading ? (
                  <p className="text-muted-foreground text-center py-8">جارٍ التحميل...</p>
                ) : chain.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">لا توجد سجلات في سلسلة التوقيع بعد</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ICV</TableHead>
                        <TableHead>Hash</TableHead>
                        <TableHead>Previous Hash</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chain.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono font-bold">{entry.icv}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate" title={entry.invoice_hash}>{entry.invoice_hash}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate" title={entry.previous_hash}>{entry.previous_hash}</TableCell>
                          <TableCell>{entry.created_at ? new Date(entry.created_at).toLocaleDateString('ar-SA') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Compliance Result Dialog */}
      <Dialog open={!!complianceResult} onOpenChange={(open) => !open && setComplianceResult(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              نتيجة فحص الامتثال
            </DialogTitle>
            <DialogDescription>تفاصيل الرد من بوابة ZATCA</DialogDescription>
          </DialogHeader>
          {complianceResult && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">النتيجة:</span>
                  <Badge variant={
                    complianceResult.validationResults?.status === 'PASS' ? 'default' :
                    complianceResult.validationResults?.status === 'WARNING' ? 'secondary' : 'destructive'
                  }>
                    {complianceResult.validationResults?.status === 'PASS' ? '✅ ناجح' :
                     complianceResult.validationResults?.status === 'WARNING' ? '⚠️ تحذيرات' : '❌ فشل'}
                  </Badge>
                </div>

                {/* Warnings — من المستوى المسطّح (موحّد من الخلفية) */}
                {(complianceResult.warningMessages?.length > 0 || complianceResult.validationResults?.warningMessages?.length > 0) && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-accent-foreground">تحذيرات:</p>
                    {(complianceResult.warningMessages || complianceResult.validationResults?.warningMessages || []).map((w: { code: string; message: string }, i: number) => (
                      <div key={i} className="text-xs bg-secondary/50 rounded p-2 border border-border">
                        <span className="font-mono">{w.code}</span>: {w.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Errors */}
                {(complianceResult.errorMessages?.length > 0 || complianceResult.validationResults?.errorMessages?.length > 0) && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">أخطاء:</p>
                    {(complianceResult.errorMessages || complianceResult.validationResults?.errorMessages || []).map((e: { code: string; message: string }, i: number) => (
                      <div key={i} className="text-xs bg-destructive/10 rounded p-2 border border-destructive/20">
                        <span className="font-mono">{e.code}</span>: {e.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Info Messages */}
                {(complianceResult.infoMessages?.length > 0 || complianceResult.validationResults?.infoMessages?.length > 0) && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">معلومات:</p>
                    {(complianceResult.infoMessages || complianceResult.validationResults?.infoMessages || []).map((m: { code: string; message: string }, i: number) => (
                      <div key={i} className="text-xs bg-muted rounded p-2">
                        <span className="font-mono">{m.code}</span>: {m.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default ZatcaManagementPage;
