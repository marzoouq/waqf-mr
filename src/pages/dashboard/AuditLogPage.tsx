import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ShieldCheck, ChevronDown, ChevronUp, Search, Activity, Clock, CalendarDays } from 'lucide-react';
import { useAuditLog, getTableNameAr, getOperationNameAr } from '@/hooks/useAuditLog';
import TablePagination from '@/components/TablePagination';

const ITEMS_PER_PAGE = 15;

const operationColor = (op: string) => {
  switch (op) {
    case 'INSERT': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'UPDATE': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
    default: return '';
  }
};

const formatValue = (val: unknown): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
};

const FIELD_LABELS: Record<string, string> = {
  amount: 'المبلغ', source: 'المصدر', date: 'التاريخ', description: 'الوصف',
  expense_type: 'نوع المصروف', notes: 'ملاحظات', property_id: 'العقار',
  fiscal_year_id: 'السنة المالية', contract_id: 'العقد', created_at: 'تاريخ الإنشاء',
  updated_at: 'تاريخ التحديث', id: 'المعرف', total_income: 'إجمالي الدخل',
  total_expenses: 'إجمالي المصروفات', admin_share: 'حصة الناظر',
  waqif_share: 'حصة الواقف', waqf_revenue: 'ريع الوقف',
  name: 'الاسم', share_percentage: 'نسبة الحصة', status: 'الحالة',
  beneficiary_id: 'المستفيد', account_id: 'الحساب',
};

const getFieldLabel = (key: string) => FIELD_LABELS[key] || key;

const DataDiff = ({ oldData, newData, operation }: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  operation: string;
}) => {
  if (operation === 'INSERT' && newData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {Object.entries(newData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-emerald-700">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'DELETE' && oldData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {Object.entries(oldData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-red-700 line-through">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'UPDATE' && oldData && newData) {
    const changedKeys = Object.keys(newData).filter(
      k => !['id', 'created_at', 'updated_at'].includes(k) && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    );
    if (changedKeys.length === 0) return <p className="text-sm text-muted-foreground">لا توجد تغييرات ظاهرة</p>;
    return (
      <div className="space-y-2 text-sm">
        {changedKeys.map(key => (
          <div key={key} className="flex flex-wrap gap-2 items-center">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-red-600 line-through">{formatValue(oldData[key])}</span>
            <span>←</span>
            <span className="text-emerald-700">{formatValue(newData[key])}</span>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">لا توجد بيانات</p>;
};

const AuditLogPage = () => {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: logs = [], isLoading } = useAuditLog({
    tableName: tableFilter !== 'all' ? tableFilter : undefined,
    operation: opFilter !== 'all' ? opFilter : undefined,
  });

  const filtered = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l =>
      getTableNameAr(l.table_name).includes(q) ||
      getOperationNameAr(l.operation).includes(q) ||
      l.table_name.includes(q)
    );
  }, [logs, searchQuery]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return logs.filter(l => l.created_at.startsWith(today)).length;
  }, [logs]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-7 h-7 text-primary shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">سجل المراجعة</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" />إجمالي العمليات</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{logs.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4" />عمليات اليوم</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{todayCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />آخر عملية</CardTitle></CardHeader>
            <CardContent><p className="text-sm font-medium">{logs[0] ? new Date(logs[0].created_at).toLocaleString('ar-SA') : '—'}</p></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-9" />
          </div>
          <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="الجدول" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الجداول</SelectItem>
              <SelectItem value="income">الدخل</SelectItem>
              <SelectItem value="expenses">المصروفات</SelectItem>
              <SelectItem value="accounts">الحسابات</SelectItem>
              <SelectItem value="distributions">التوزيعات</SelectItem>
              <SelectItem value="invoices">الفواتير</SelectItem>
            </SelectContent>
          </Select>
          <Select value={opFilter} onValueChange={v => { setOpFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="العملية" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العمليات</SelectItem>
              <SelectItem value="INSERT">إضافة</SelectItem>
              <SelectItem value="UPDATE">تعديل</SelectItem>
              <SelectItem value="DELETE">حذف</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">لا توجد سجلات</div>
            ) : (
              <>
                <Table>
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
                    {paginated.map(log => {
                      const isExpanded = expandedRows.has(log.id);
                      const summary = log.operation === 'INSERT'
                        ? `إضافة سجل جديد في ${getTableNameAr(log.table_name)}`
                        : log.operation === 'DELETE'
                          ? `حذف سجل من ${getTableNameAr(log.table_name)}`
                          : `تعديل سجل في ${getTableNameAr(log.table_name)}`;
                      return (
                        <Collapsible key={log.id} open={isExpanded} onOpenChange={() => toggleRow(log.id)} asChild>
                          <>
                            <CollapsibleTrigger asChild>
                              <TableRow className="cursor-pointer hover:bg-muted/50">
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </Button>
                                </TableCell>
                                <TableCell className="text-sm">{new Date(log.created_at).toLocaleString('ar-SA')}</TableCell>
                                <TableCell>{getTableNameAr(log.table_name)}</TableCell>
                                <TableCell>
                                  <Badge className={operationColor(log.operation)} variant="outline">
                                    {getOperationNameAr(log.operation)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{summary}</TableCell>
                              </TableRow>
                            </CollapsibleTrigger>
                            <CollapsibleContent asChild>
                              <tr>
                                <td colSpan={5} className="bg-muted/30 p-4 border-b">
                                  <DataDiff
                                    oldData={log.old_data as Record<string, unknown> | null}
                                    newData={log.new_data as Record<string, unknown> | null}
                                    operation={log.operation}
                                  />
                                </td>
                              </tr>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filtered.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogPage;
