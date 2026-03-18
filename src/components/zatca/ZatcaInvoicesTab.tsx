/**
 * تبويب فواتير ZATCA — الجدول + الفلاتر + الإجراءات
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TablePagination from '@/components/TablePagination';
import { FileCode, PenTool, Send, RefreshCw, Loader2, ClipboardCheck } from 'lucide-react';
import { fmt } from '@/utils/format';

const ZATCA_STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_submitted: { label: 'لم تُرسل', variant: 'outline' },
  pending: { label: 'قيد المعالجة', variant: 'secondary' },
  submitted: { label: 'مُرسلة', variant: 'default' },
  reported: { label: 'تم الإبلاغ', variant: 'default' },
  cleared: { label: 'مُعتمدة', variant: 'default' },
  rejected: { label: 'مرفوضة', variant: 'destructive' },
  compliance_passed: { label: 'اجتاز الفحص', variant: 'default' },
};

interface ZatcaInvoice {
  id: string;
  invoice_number: string | null;
  invoice_type: string | null;
  amount: number;
  vat_amount: number;
  vat_rate: number;
  date: string;
  zatca_status: string | null;
  zatca_uuid: string | null;
  zatca_xml: string | null;
  invoice_hash: string | null;
  icv: number | null;
  source: 'invoices' | 'payment_invoices';
}

interface ZatcaInvoicesTabProps {
  allInvoices: ZatcaInvoice[];
  paginatedInvoices: ZatcaInvoice[];
  invoicesLoading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  invoicePage: number;
  setInvoicePage: (p: number) => void;
  itemsPerPage: number;
  isComplianceCert: boolean;
  isProductionCert: boolean;
  pendingAction: { id: string; type: string } | null;
  onGenerateXml: (invoiceId: string, table: string) => void;
  onSignInvoice: (invoiceId: string, table: string) => void;
  onSubmitToZatca: (invoiceId: string, table: string, action: 'report' | 'clearance') => void;
  onComplianceCheck: (invoiceId: string, table: string) => void;
}

export default function ZatcaInvoicesTab({
  allInvoices, paginatedInvoices, invoicesLoading, statusFilter, setStatusFilter,
  invoicePage, setInvoicePage, itemsPerPage, isComplianceCert, isProductionCert,
  pendingAction, onGenerateXml, onSignInvoice, onSubmitToZatca, onComplianceCheck,
}: ZatcaInvoicesTabProps) {
  const isRowPending = (id: string) => pendingAction?.id === id;

  return (
    <div className="space-y-4">
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
                    <TableCell>{fmt(Number(inv.amount))} ر.س</TableCell>
                    <TableCell>{fmt(Number(inv.vat_amount))} ({inv.vat_rate}%)</TableCell>
                    <TableCell>{inv.date}</TableCell>
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
                        {!isSubmitted && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant={hasXml ? 'ghost' : 'outline'} onClick={() => onGenerateXml(inv.id, inv.source)} disabled={rowBusy || hasSig}>
                                  {rowBusy && pendingAction?.type === 'xml' ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCode className="w-3 h-3" />}
                                  <span className="mr-1 text-xs">XML</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{hasSig ? 'لا يمكن إعادة توليد XML بعد التوقيع' : hasXml ? 'إعادة توليد XML' : 'توليد XML'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!isSubmitted && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant={hasSig ? 'ghost' : 'outline'} onClick={() => onSignInvoice(inv.id, inv.source)} disabled={rowBusy || !canSign}>
                                  {rowBusy && pendingAction?.type === 'sign' ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenTool className="w-3 h-3" />}
                                  <span className="mr-1 text-xs">توقيع</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{!hasXml ? 'يجب توليد XML أولاً' : hasSig ? 'موقّعة مسبقاً' : 'توقيع الفاتورة'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {canComplianceCheck && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="secondary" onClick={() => onComplianceCheck(inv.id, inv.source)} disabled={rowBusy}>
                                  {rowBusy && pendingAction?.type === 'compliance' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardCheck className="w-3 h-3" />}
                                  <span className="mr-1 text-xs">فحص</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>فحص امتثال الفاتورة عبر بوابة ZATCA</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!isSubmitted && isProductionCert && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" onClick={() => {
                                  const action = inv.invoice_type === 'standard' ? 'clearance' : 'report';
                                  onSubmitToZatca(inv.id, inv.source, action);
                                }} disabled={rowBusy || !canSubmit}>
                                  {rowBusy && pendingAction?.type === 'submit' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  <span className="mr-1 text-xs">إرسال</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{!hasXml ? 'يجب توليد XML أولاً' : !hasSig ? 'يجب التوقيع أولاً' : 'إرسال إلى ZATCA'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {inv.zatca_status === 'rejected' && isProductionCert && (
                          <Button size="sm" variant="destructive" onClick={() => {
                            const action = inv.invoice_type === 'standard' ? 'clearance' : 'report';
                            onSubmitToZatca(inv.id, inv.source, action);
                          }} disabled={rowBusy}>
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
        <TablePagination currentPage={invoicePage} totalItems={allInvoices.length} itemsPerPage={itemsPerPage} onPageChange={setInvoicePage} />
      </Card>
    </div>
  );
}
