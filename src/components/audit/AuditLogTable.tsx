/**
 * جدول سجل المراجعة — desktop + mobile
 */
import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DataDiff } from '@/components/audit/DataDiff';
import { operationColor, getTableNameAr, getOperationNameAr } from '@/utils/format/auditLabels';
import { TablePagination, TableSkeleton } from '@/components/common';
import { fmtDateTime } from '@/utils/format/format';

interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  record_id: string | null;
  user_id: string | null;
  created_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading: boolean;
  isMobile: boolean;
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  getSummary: (log: AuditLog) => string;
  currentPage: number;
  totalCount: number;
  itemsPerPage: number;
  setCurrentPage: (p: number) => void;
}

const AuditLogTable = ({
  logs, isLoading, isMobile, expandedRows, toggleRow, getSummary,
  currentPage, totalCount, itemsPerPage, setCurrentPage,
}: AuditLogTableProps) => {
  if (isLoading) return <TableSkeleton rows={5} cols={4} />;

  if (logs.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">لا توجد سجلات</div>;
  }

  return (
    <>
      {isMobile ? (
        <div className="space-y-3 p-3">
          {logs.map(log => (
            <Collapsible key={log.id} open={expandedRows.has(log.id)} onOpenChange={() => toggleRow(log.id)}>
              <Card className="shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-3 space-y-2 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <Badge className={operationColor(log.operation)} variant="outline">{getOperationNameAr(log.operation)}</Badge>
                      <span className="text-xs text-muted-foreground">{fmtDateTime(log.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{getTableNameAr(log.table_name)}</span>
                      <span className="h-6 w-6 flex items-center justify-center">{expandedRows.has(log.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{getSummary(log)}</p>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-2 border-t">
                    <DataDiff oldData={log.old_data as Record<string, unknown> | null} newData={log.new_data as Record<string, unknown> | null} operation={log.operation} />
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right w-10"></TableHead>
                <TableHead className="text-right">التاريخ والوقت</TableHead>
                <TableHead className="text-right">الجدول</TableHead>
                <TableHead className="text-right">العملية</TableHead>
                <TableHead className="text-right">ملخص</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => {
                const isExpanded = expandedRows.has(log.id);
                return (
                  <Fragment key={log.id}>
                    <TableRow
                      data-state={isExpanded ? 'open' : 'closed'}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRow(log.id)}
                    >
                      <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" aria-label={isExpanded ? 'طي' : 'توسيع'} aria-expanded={isExpanded}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button></TableCell>
                      <TableCell className="text-sm">{fmtDateTime(log.created_at)}</TableCell>
                      <TableCell>{getTableNameAr(log.table_name)}</TableCell>
                      <TableCell><Badge className={operationColor(log.operation)} variant="outline">{getOperationNameAr(log.operation)}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getSummary(log)}</TableCell>
                    </TableRow>
                    {isExpanded && (
                      <tr><td colSpan={5} className="bg-muted/30 p-4 border-b"><DataDiff oldData={log.old_data as Record<string, unknown> | null} newData={log.new_data as Record<string, unknown> | null} operation={log.operation} /></td></tr>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <TablePagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
    </>
  );
};

export default AuditLogTable;
