/**
 * جدول سجل المراجعة — desktop + mobile
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { operationColor, DataDiff } from '@/components/audit/AuditLogHelpers';
import { getTableNameAr, getOperationNameAr } from '@/hooks/page/admin/management/useAuditLogPage';
import { TablePagination, TableSkeleton } from '@/components/common';

interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  record_id: string | null;
  user_id: string | null;
  created_at: string;
  old_data: unknown;
  new_data: unknown;
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
                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('ar-SA')}</span>
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
                  <Collapsible key={log.id} open={isExpanded} onOpenChange={() => toggleRow(log.id)} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell><Button variant="ghost" size="icon" className="h-6 w-6">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button></TableCell>
                          <TableCell className="text-sm">{new Date(log.created_at).toLocaleString('ar-SA')}</TableCell>
                          <TableCell>{getTableNameAr(log.table_name)}</TableCell>
                          <TableCell><Badge className={operationColor(log.operation)} variant="outline">{getOperationNameAr(log.operation)}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{getSummary(log)}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <tr><td colSpan={5} className="bg-muted/30 p-4 border-b"><DataDiff oldData={log.old_data as Record<string, unknown> | null} newData={log.new_data as Record<string, unknown> | null} operation={log.operation} /></td></tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
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
