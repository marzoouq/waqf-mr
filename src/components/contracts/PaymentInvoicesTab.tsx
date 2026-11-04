/**
 * تبويب فواتير الدفعات — عرض وإدارة فواتير العقود
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, Check, X, Loader2 } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { TablePagination } from '@/components/common';
import { InvoiceStepsGuide, InvoicePreviewDialog } from '@/components/invoices';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

import { usePaymentInvoicesTab } from '@/hooks/page/admin/financial/usePaymentInvoicesTab';
import PaymentInvoiceSummaryCards from './payment-invoices/PaymentInvoiceSummaryCards';
import PaymentInvoiceToolbar from './payment-invoices/PaymentInvoiceToolbar';
import PaymentInvoiceMobileCards from './payment-invoices/PaymentInvoiceMobileCards';
import PaymentInvoiceDesktopTable from './payment-invoices/PaymentInvoiceDesktopTable';
import PayInvoiceDialog from './payment-invoices/PayInvoiceDialog';

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

      <PayInvoiceDialog payDialog={payDialog} setPayDialog={setPayDialog} payAmount={payAmount} setPayAmount={setPayAmount} handlePay={handlePay} />

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
          <Button size="sm" className="gap-2 ms-auto" onClick={handleBulkPay} disabled={bulkPaying}>
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
