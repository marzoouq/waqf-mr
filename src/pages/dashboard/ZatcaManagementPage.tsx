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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShieldCheck, FileText, Link2, RefreshCw, Send, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const ZATCA_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_submitted: { label: 'لم تُرسل', variant: 'outline' },
  pending: { label: 'قيد المعالجة', variant: 'secondary' },
  submitted: { label: 'مُرسلة', variant: 'default' },
  reported: { label: 'تم الإبلاغ', variant: 'default' },
  cleared: { label: 'مُعتمدة', variant: 'default' },
  rejected: { label: 'مرفوضة', variant: 'destructive' },
};

function ZatcaManagementPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ─── Certificates ───
  const { data: certificates = [], isLoading: certsLoading } = useQuery({
    queryKey: ['zatca-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('zatca_certificates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ─── Invoices (both tables) ───
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['zatca-invoices', statusFilter],
    queryFn: async () => {
      let q = supabase.from('invoices').select('id, invoice_number, invoice_type, amount, vat_amount, vat_rate, date, zatca_status, zatca_uuid, invoice_hash, icv').order('date', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('zatca_status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(i => ({ ...i, source: 'invoices' as const }));
    },
  });

  const { data: paymentInvoices = [] } = useQuery({
    queryKey: ['zatca-payment-invoices', statusFilter],
    queryFn: async () => {
      let q = supabase.from('payment_invoices').select('id, invoice_number, amount, vat_amount, vat_rate, due_date, zatca_status, zatca_uuid').order('due_date', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('zatca_status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(i => ({ ...i, source: 'payment_invoices' as const, date: i.due_date }));
    },
  });

  const allInvoices = [...invoices, ...paymentInvoices];

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
      const { data, error } = await supabase.functions.invoke('zatca-xml-generator', {
        body: { invoice_id: invoiceId, table },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم توليد XML بنجاح');
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Sign Invoice ───
  const signInvoice = useMutation({
    mutationFn: async ({ invoiceId, table }: { invoiceId: string; table: string }) => {
      const { data, error } = await supabase.functions.invoke('zatca-signer', {
        body: { invoice_id: invoiceId, table },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم التوقيع بنجاح');
      queryClient.invalidateQueries({ queryKey: ['zatca-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-chain'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Report / Clearance ───
  const submitToZatca = useMutation({
    mutationFn: async ({ invoiceId, table, action }: { invoiceId: string; table: string; action: 'report' | 'clearance' }) => {
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
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Summary Cards ───
  const submitted = allInvoices.filter(i => ['submitted', 'reported', 'cleared'].includes(i.zatca_status || '')).length;
  const pending = allInvoices.filter(i => i.zatca_status === 'not_submitted' || !i.zatca_status).length;
  const rejected = allInvoices.filter(i => i.zatca_status === 'rejected').length;
  const activeCert = certificates.find(c => c.is_active);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <h1 className="text-2xl font-bold text-foreground">إدارة ZATCA</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-foreground">{submitted}</p>
              <p className="text-sm text-muted-foreground">مُرسلة / مُعتمدة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
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
              <p className="text-sm font-bold text-foreground">{activeCert ? 'نشطة' : 'غير مسجّل'}</p>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                      <TableHead>حالة ZATCA</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell></TableRow>
                    ) : allInvoices.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد فواتير</TableCell></TableRow>
                    ) : allInvoices.map(inv => {
                      const status = ZATCA_STATUS_MAP[inv.zatca_status || 'not_submitted'] || ZATCA_STATUS_MAP.not_submitted;
                      const isNotSubmitted = !inv.zatca_status || inv.zatca_status === 'not_submitted';
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoice_number || '—'}</TableCell>
                          <TableCell>{Number(inv.amount).toLocaleString()} ر.س</TableCell>
                          <TableCell>{Number(inv.vat_amount).toLocaleString()} ({inv.vat_rate}%)</TableCell>
                          <TableCell>{inv.date}</TableCell>
                          <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {isNotSubmitted && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateXml.mutate({ invoiceId: inv.id, table: inv.source })}
                                    disabled={generateXml.isPending}
                                  >
                                    <RefreshCw className="w-3 h-3 ml-1" />XML
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => signInvoice.mutate({ invoiceId: inv.id, table: inv.source })}
                                    disabled={signInvoice.isPending}
                                  >
                                    <ShieldCheck className="w-3 h-3 ml-1" />توقيع
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => submitToZatca.mutate({ invoiceId: inv.id, table: inv.source, action: 'report' })}
                                    disabled={submitToZatca.isPending}
                                  >
                                    <Send className="w-3 h-3 ml-1" />إرسال
                                  </Button>
                                </>
                              )}
                              {inv.zatca_status === 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => submitToZatca.mutate({ invoiceId: inv.id, table: inv.source, action: 'report' })}
                                  disabled={submitToZatca.isPending}
                                >
                                  <RefreshCw className="w-3 h-3 ml-1" />إعادة إرسال
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
            </Card>
          </TabsContent>

          {/* ─── Certificates Tab ─── */}
          <TabsContent value="certificates" className="space-y-4">
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
                    <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500" />
                    <p className="text-muted-foreground">لا توجد شهادات مسجّلة</p>
                    <p className="text-sm text-muted-foreground">يجب التسجيل في بوابة فاتورة أولاً للحصول على CSID</p>
                    <Button
                      onClick={async () => {
                        const { error } = await supabase.functions.invoke('zatca-api', { body: { action: 'onboard' } });
                        if (error) toast.error(error.message);
                        else {
                          toast.success('تم إرسال طلب التسجيل');
                          queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
                        }
                      }}
                    >
                      بدء التسجيل (Onboarding)
                    </Button>
                  </div>
                ) : (
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
                          <TableCell>{cert.certificate_type}</TableCell>
                          <TableCell>
                            <Badge variant={cert.is_active ? 'default' : 'secondary'}>
                              {cert.is_active ? 'نشطة' : 'غير نشطة'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{cert.request_id || '—'}</TableCell>
                          <TableCell>{cert.created_at ? new Date(cert.created_at).toLocaleDateString('ar-SA') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
    </DashboardLayout>
  );
}

export default ZatcaManagementPage;
