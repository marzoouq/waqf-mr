/**
 * تبويب فواتير ZATCA — منظِّم نحيف يجمع الفلاتر والصفوف
 */
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/common';
import ZatcaInvoiceFilters from './ZatcaInvoiceFilters';
import ZatcaInvoiceRow, { type ZatcaInvoice } from './ZatcaInvoiceRow';

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
  pendingIds: Set<string>;
  onGenerateXml: (invoiceId: string, table: string) => void;
  onSignInvoice: (invoiceId: string, table: string) => void;
  onSubmitToZatca: (invoiceId: string, table: string, action: 'report' | 'clearance') => void;
  onComplianceCheck: (invoiceId: string, table: string) => void;
}

export default function ZatcaInvoicesTab({
  allInvoices, paginatedInvoices, invoicesLoading, statusFilter, setStatusFilter,
  invoicePage, setInvoicePage, itemsPerPage, isComplianceCert, isProductionCert,
  pendingIds, onGenerateXml, onSignInvoice, onSubmitToZatca, onComplianceCheck,
}: ZatcaInvoicesTabProps) {
  return (
    <div className="space-y-4">
      <ZatcaInvoiceFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        resetPage={() => setInvoicePage(1)}
        isComplianceCert={isComplianceCert}
      />

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
              ) : paginatedInvoices.map(inv => (
                <ZatcaInvoiceRow
                  key={inv.id}
                  inv={inv}
                  rowBusy={pendingIds.has(inv.id)}
                  isComplianceCert={isComplianceCert}
                  isProductionCert={isProductionCert}
                  onGenerateXml={onGenerateXml}
                  onSignInvoice={onSignInvoice}
                  onSubmitToZatca={onSubmitToZatca}
                  onComplianceCheck={onComplianceCheck}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <TablePagination currentPage={invoicePage} totalItems={allInvoices.length} itemsPerPage={itemsPerPage} onPageChange={setInvoicePage} />
      </Card>
    </div>
  );
}
