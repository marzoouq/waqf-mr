/**
 * جدول فواتير الدفعات لسطح المكتب
 */
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle2, Clock, AlertTriangle,
  Check, X, Download, Loader2,
  ArrowUpDown, ArrowUp, ArrowDown, Eye,
} from 'lucide-react';
import { fmt } from '@/utils/format';
import type { SortKey } from '@/hooks/page/usePaymentInvoicesTab';
import type { PaymentInvoice } from '@/hooks/data/invoices/usePaymentInvoices';

interface PaymentInvoiceDesktopTableProps {
  groupedPaginated: Map<string, PaymentInvoice[]>;
  isClosed: boolean;
  selectedIds: Set<string>;
  unpaidFiltered: PaymentInvoice[];
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  toggleSort: (key: SortKey) => void;
  payingInvoiceId: string | null;
  openPayDialog: (inv: PaymentInvoice) => void;
  handlePreviewTemplate: (inv: PaymentInvoice) => void;
  markUnpaid: { mutate: (id: string) => void; isPending: boolean };
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid': return <Badge className="bg-success/20 text-success border-0 gap-1"><CheckCircle2 className="w-3 h-3" />مسددة</Badge>;
    case 'overdue': return <Badge className="bg-destructive/20 text-destructive border-0 gap-1"><AlertTriangle className="w-3 h-3" />متأخرة</Badge>;
    case 'pending': return <Badge className="bg-warning/20 text-warning border-0 gap-1"><Clock className="w-3 h-3" />قيد الانتظار</Badge>;
    case 'partially_paid': return <Badge className="bg-accent/20 text-accent-foreground border-0 gap-1"><Clock className="w-3 h-3" />جزئية</Badge>;
    default: return <Badge className="bg-muted text-muted-foreground border-0">{status}</Badge>;
  }
};

export default function PaymentInvoiceDesktopTable({
  groupedPaginated, isClosed, selectedIds, unpaidFiltered,
  toggleSelect, toggleSelectAll, sortKey, sortDir, toggleSort,
  payingInvoiceId, openPayDialog, handlePreviewTemplate, markUnpaid,
}: PaymentInvoiceDesktopTableProps) {
  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div className="overflow-x-auto hidden md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {!isClosed && (
              <TableHead className="w-10 text-center">
                <Checkbox checked={unpaidFiltered.length > 0 && selectedIds.size === unpaidFiltered.length} onCheckedChange={toggleSelectAll} />
              </TableHead>
            )}
            <TableHead className="text-right">رقم الفاتورة</TableHead>
            <TableHead className="text-right">المستأجر</TableHead>
            <TableHead className="text-right">العقار</TableHead>
            <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort('payment_number')}>
              <span className="inline-flex items-center gap-1">رقم الدفعة <SortIcon field="payment_number" /></span>
            </TableHead>
            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
              <span className="inline-flex items-center gap-1">تاريخ الاستحقاق <SortIcon field="due_date" /></span>
            </TableHead>
            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('amount')}>
              <span className="inline-flex items-center gap-1">المبلغ <SortIcon field="amount" /></span>
            </TableHead>
            <TableHead className="text-right">الضريبة</TableHead>
            <TableHead className="text-right">تاريخ السداد</TableHead>
            <TableHead className="text-center cursor-pointer select-none" onClick={() => toggleSort('status')}>
              <span className="inline-flex items-center gap-1">الحالة <SortIcon field="status" /></span>
            </TableHead>
            <TableHead className="text-center">إجراء</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...groupedPaginated.entries()].map(([contractId, invs]) => {
            const first = invs[0];
            return (
              <>{/* صف عنوان المجموعة */}
                <TableRow key={`header-${contractId}`} className="bg-muted/30 hover:bg-muted/40">
                  <TableCell colSpan={isClosed ? 10 : 11} className="py-2 px-4">
                    <span className="text-xs font-bold text-foreground">{first?.contract?.contract_number || '-'}</span>
                    <span className="text-xs text-muted-foreground mr-2">— {first?.contract?.tenant_name}</span>
                    <span className="text-xs text-muted-foreground mr-2">• {first?.contract?.property?.property_number || ''}</span>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 mr-2">{invs.length} فاتورة</Badge>
                  </TableCell>
                </TableRow>
                {invs.map((inv) => (
                  <TableRow key={inv.id} className={inv.status === 'overdue' ? 'bg-destructive/5' : ''}>
                    {!isClosed && (
                      <TableCell className="text-center">
                        {inv.status !== 'paid' && <Checkbox checked={selectedIds.has(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} />}
                      </TableCell>
                    )}
                    <TableCell className="font-medium font-mono text-xs">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.contract?.tenant_name || '-'}</TableCell>
                    <TableCell>{inv.contract?.property?.property_number || '-'}</TableCell>
                    <TableCell className="text-center">{inv.payment_number}</TableCell>
                    <TableCell>{inv.due_date}</TableCell>
                    <TableCell>{fmt(Number(inv.amount))} ر.س</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {Number(inv.vat_amount) > 0 ? `${fmt(Number(inv.vat_amount))} (${inv.vat_rate}%)` : 'معفاة'}
                    </TableCell>
                    <TableCell className={inv.paid_date ? 'text-success' : 'text-muted-foreground'}>{inv.paid_date || '-'}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePreviewTemplate(inv)} title="معاينة الفاتورة"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handlePreviewTemplate(inv)} title="تحميل PDF"><Download className="w-3.5 h-3.5" /></Button>
                        {!isClosed && (
                          inv.status !== 'paid' ? (
                            <Button size="sm" variant="ghost" className="gap-1 text-success h-8" onClick={() => openPayDialog(inv)} disabled={payingInvoiceId === inv.id}>
                              {payingInvoiceId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}تسديد
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground h-8" onClick={() => markUnpaid.mutate(inv.id)} disabled={markUnpaid.isPending}>
                              <X className="w-3.5 h-3.5" />إلغاء
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
