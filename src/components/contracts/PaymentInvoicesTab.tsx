/**
 * تبويب فواتير الدفعات — عرض وإدارة فواتير العقود
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Receipt, Check, X, Loader2 } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { TablePagination } from '@/components/common';
import { InvoiceStepsGuide, InvoicePreviewDialog } from '@/components/invoices';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

import { fmt } from '@/utils/format/format';
import { usePaymentInvoicesTab } from '@/hooks/page/admin/financial/usePaymentInvoicesTab';
import PaymentInvoiceSummaryCards from './payment-invoices/PaymentInvoiceSummaryCards';
import PaymentInvoiceToolbar from './payment-invoices/PaymentInvoiceToolbar';
import PaymentInvoiceMobileCards from './payment-invoices/PaymentInvoiceMobileCards';
import PaymentInvoiceDesktopTable from './payment-invoices/PaymentInvoiceDesktopTable';

interface PaymentInvoicesTabProps {
  fiscalYearId: string;
  isClosed: boolean;
}

export default function PaymentInvoicesTab({ fiscalYearId, isClosed }: PaymentInvoicesTabProps) {
  const {
    isLoading, invoices, summary, sorted, groupedPaginated, ITEMS_PER_PAGE,
    search, setSearch, filter, setFilter, dateFrom, setDateFrom, dateTo, setDateTo,
    sortKey, sortDir, toggleSort,
    currentPage, setCurrentPage,
    selectedIds, unpaidFiltered, toggleSelect, toggleSelectAll, bulkPaying, handleBulkPay, clearSelection,
    payingInvoiceId, payDialog, setPayDialog, payAmount, setPayAmount, openPayDialog, handlePay,
    previewInvoice, setPreviewInvoice, handlePreviewTemplate,
    generateAll, markUnpaid, waqfInfo,
  } = usePaymentInvoicesTab(fiscalYearId);

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-5">
      <InvoiceStepsGuide />

      {(!waqfInfo.vatNumber || !waqfInfo.commercialReg || !waqfInfo.address) && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <AlertDescription className="text-sm">
            لضمان امتثال الفاتورة الضريبية، يرجى إكمال بيانات المنشأة (الرقم الضريبي، السجل التجاري، العنوان) في{' '}
            <Link to="/dashboard/settings" className="underline font-medium text-primary hover:text-primary/80">الإعدادات</Link>
          </AlertDescription>
        </Alert>
      )}

      <InvoicePreviewDialog
        open={!!previewInvoice}
        onOpenChange={(open) => { if (!open) setPreviewInvoice(null); }}
        invoice={previewInvoice}
      />

      {/* Dialog الدفع الجزئي */}
      <Dialog open={!!payDialog} onOpenChange={(open) => { if (!open) setPayDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسديد فاتورة {payDialog?.inv.invoice_number}</DialogTitle>
            <DialogDescription>أدخل المبلغ المدفوع — إذا كان أقل من الإجمالي ستُسجّل كدفعة جزئية</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي الفاتورة</span>
              <span className="font-bold">{fmt(Number(payDialog?.inv.amount || 0))} ر.س</span>
            </div>
            <div className="space-y-1">
              <Label htmlFor="payment-invoices-tab-field-1">المبلغ المدفوع (ر.س)</Label>
              <Input name="payAmount" id="payment-invoices-tab-field-1" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min={0} max={Number(payDialog?.inv.amount || 0)} step="0.01" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayDialog(null)}>إلغاء</Button>
            <Button onClick={handlePay} className="gap-1"><Check className="w-4 h-4" />تسديد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentInvoiceSummaryCards summary={summary} />

      <PaymentInvoiceToolbar
        search={search} setSearch={setSearch}
        filter={filter} setFilter={setFilter}
        dateFrom={dateFrom} setDateFrom={setDateFrom}
        dateTo={dateTo} setDateTo={setDateTo}
        invoicesCount={invoices.length}
        summary={summary}
        isClosed={isClosed} fiscalYearId={fiscalYearId}
        generateAll={generateAll}
        invoices={invoices} waqfInfo={waqfInfo}
      />

      {/* شريط التسديد الجماعي */}
      {!isClosed && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-success/30 bg-success/10">
          <Check className="w-4 h-4 text-success shrink-0" />
          <span className="text-sm font-medium">تم تحديد {selectedIds.size} فاتورة</span>
          <Button size="sm" className="gap-2 mr-auto" onClick={handleBulkPay} disabled={bulkPaying}>
            {bulkPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            تسديد المختارة
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* الجدول */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {invoices.length === 0 ? 'لا توجد فواتير. اضغط "توليد فواتير جميع العقود" لإنشائها.' : 'لا توجد فواتير مطابقة للبحث'}
              </p>
            </div>
          ) : (
            <>
              <PaymentInvoiceMobileCards
                groupedPaginated={groupedPaginated}
                isClosed={isClosed}
                selectedIds={selectedIds}
                toggleSelect={toggleSelect}
                payingInvoiceId={payingInvoiceId}
                openPayDialog={openPayDialog}
                handlePreviewTemplate={handlePreviewTemplate}
                markUnpaid={markUnpaid}
              />
              <PaymentInvoiceDesktopTable
                groupedPaginated={groupedPaginated}
                isClosed={isClosed}
                selectedIds={selectedIds}
                unpaidFiltered={unpaidFiltered}
                toggleSelect={toggleSelect}
                toggleSelectAll={toggleSelectAll}
                sortKey={sortKey}
                sortDir={sortDir}
                toggleSort={toggleSort}
                payingInvoiceId={payingInvoiceId}
                openPayDialog={openPayDialog}
                handlePreviewTemplate={handlePreviewTemplate}
                markUnpaid={markUnpaid}
              />
            </>
          )}
          <TablePagination currentPage={currentPage} totalItems={sorted.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>
    </div>
  );
}
