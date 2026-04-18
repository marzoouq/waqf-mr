/**
 * AdvanceRequestsTable — جدول طلبات السلف + Pagination
 * مكوّن UI خالص — يتلقى الحالة من useAdvanceRequestsState
 */
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import type { AdvanceRequest } from '@/hooks/data/financial/useAdvanceRequests';
import AdvanceStatusBadge from './AdvanceStatusBadge';

interface Props {
  paginatedRequests: AdvanceRequest[];
  page: number;
  totalPages: number;
  setPage: (updater: (p: number) => number) => void;
  isMutating: boolean;
  onApprove: (req: AdvanceRequest) => void;
  onPaid: (req: AdvanceRequest) => void;
  onReject: (req: AdvanceRequest) => void;
}

const AdvanceRequestsTable = ({
  paginatedRequests, page, totalPages, setPage,
  isMutating, onApprove, onPaid, onReject,
}: Props) => {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-right">المستفيد</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-right">السنة المالية</TableHead>
            <TableHead className="text-right">السبب</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">إجراء</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRequests.map(req => (
            <TableRow key={req.id}>
              <TableCell className="font-medium">{req.beneficiary?.name || '—'}</TableCell>
              <TableCell>{fmt(safeNumber(req.amount))} ر.س</TableCell>
              <TableCell className="text-muted-foreground text-sm">{req.fiscal_year?.label || '—'}</TableCell>
              <TableCell className="max-w-[200px] truncate">{req.reason || '—'}</TableCell>
              <TableCell>{fmtDate(req.created_at)}</TableCell>
              <TableCell><AdvanceStatusBadge status={req.status} /></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {req.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="text-success" onClick={() => onApprove(req)} disabled={isMutating}>
                        موافقة
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => onReject(req)} disabled={isMutating}>
                        رفض
                      </Button>
                    </>
                  )}
                  {req.status === 'approved' && (
                    <Button size="sm" onClick={() => onPaid(req)} disabled={isMutating}>
                      تأكيد الصرف
                    </Button>
                  )}
                  {req.status === 'rejected' && req.rejection_reason && (
                    <span className="text-xs text-muted-foreground">{req.rejection_reason}</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-muted-foreground">
            صفحة {page + 1} من {totalPages}
          </p>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronRight className="w-4 h-4" />
              السابق
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default AdvanceRequestsTable;
