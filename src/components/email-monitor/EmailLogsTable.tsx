/**
 * EmailLogsTable — جدول سجل الرسائل مع التصفّح
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmailStatusBadge } from './EmailMonitorPrimitives';
import { formatEmailDateTime } from './emailMonitorUtils';

interface EmailLogRow {
  id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  created_at: string | null;
  error_message: string | null;
}

interface EmailLogsTableProps {
  logs: EmailLogRow[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
}

export const EmailLogsTable = ({
  logs, isLoading, totalCount, page, totalPages, setPage,
}: EmailLogsTableProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-base">سجل الرسائل ({totalCount})</CardTitle>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <Button size="sm" variant="outline" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
            السابق
          </Button>
          <span className="text-muted-foreground">صفحة {page + 1} من {totalPages}</span>
          <Button size="sm" variant="outline" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
            التالي
          </Button>
        </div>
      )}
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>القالب</TableHead>
              <TableHead>المستلم</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التوقيت</TableHead>
              <TableHead>الخطأ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد رسائل في هذه الفترة</TableCell></TableRow>
            ) : (
              logs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.template_name}</TableCell>
                  <TableCell className="text-sm">{row.recipient_email}</TableCell>
                  <TableCell><EmailStatusBadge status={row.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatEmailDateTime(row.created_at)}</TableCell>
                  <TableCell className="text-xs text-destructive max-w-xs truncate" title={row.error_message ?? ''}>
                    {row.error_message ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);
