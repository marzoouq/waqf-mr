import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ShieldCheck, ChevronDown, ChevronUp, Search, Activity, Clock, CalendarDays, ShieldAlert, Archive, FileDown } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog, getTableNameAr, getOperationNameAr } from '@/hooks/useAuditLog';
import TablePagination from '@/components/TablePagination';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import AccessLogTab from '@/components/audit/AccessLogTab';
import ArchiveLogTab from '@/components/audit/ArchiveLogTab';
import { generateAuditLogPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const ITEMS_PER_PAGE = 15;

const operationColor = (op: string) => {
  switch (op) {
    case 'INSERT': return 'bg-success/15 text-success border-success/30';
    case 'UPDATE': return 'bg-warning/15 text-warning border-warning/30';
    case 'DELETE': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'REOPEN': return 'bg-info/15 text-info border-info/30';
    case 'CLOSE': return 'bg-status-special/15 text-status-special-foreground border-status-special/30';
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
  reason: 'السبب', label: 'التسمية',
};

const getFieldLabel = (key: string) => FIELD_LABELS[key] || key;

const DataDiff = ({ oldData, newData, operation }: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  operation: string;
}) => {
  if (operation === 'REOPEN' && newData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {oldData && Object.entries(oldData).map(([key, val]) => (
          <div key={`old-${key}`} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)} (قبل):</span>
            <span className="text-destructive line-through">{formatValue(val)}</span>
          </div>
        ))}
        {Object.entries(newData).map(([key, val]) => (
          <div key={`new-${key}`} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)} (بعد):</span>
            <span className="text-success">{formatValue(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'INSERT' && newData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {Object.entries(newData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-muted-foreground">{getFieldLabel(key)}:</span>
            <span className="text-success">{formatValue(val)}</span>
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
            <span className="text-destructive line-through">{formatValue(val)}</span>
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
            <span className="text-destructive line-through">{formatValue(oldData[key])}</span>
            <span>←</span>
            <span className="text-success">{formatValue(newData[key])}</span>
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
  const [exporting, setExporting] = useState(false);
  const _isMobile = useIsMobile();
  const waqfInfo = usePdfWaqfInfo();

  const { data: auditData, isLoading } = useAuditLog({
    tableName: tableFilter !== 'all' ? tableFilter : undefined,
    operation: opFilter !== 'all' ? opFilter : undefined,
    searchQuery: searchQuery || undefined,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
  });

  const logs = auditData?.logs ?? [];
  const totalCount = auditData?.totalCount ?? 0;

  const paginated = logs;
  const filtered = logs; // alias for export/empty-state checks

  const { data: todayCount = 0 } = useQuery({
    queryKey: ['audit_log_today_count'],
    staleTime: 30_000,
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStr);
      return count ?? 0;
    },
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleExportPdf = async () => {
    if (filtered.length === 0) {
      toast.error('لا توجد سجلات للتصدير');
      return;
    }
    setExporting(true);
    try {
      await generateAuditLogPDF({
        logs: filtered,
        waqfInfo,
        tableFilter,
        opFilter,
      });
      toast.success('تم تصدير سجل المراجعة بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
         <PageHeaderCard
           title="سجل المراجعة"
           icon={ShieldCheck}
           description="تتبع جميع العمليات والتغييرات على النظام"
           actions={
             <Button
               variant="outline"
               size="sm"
               onClick={handleExportPdf}
               disabled={exporting || filtered.length === 0}
               className="gap-2"
             >
               <FileDown className="w-4 h-4" />
               {exporting ? 'جاري التصدير...' : 'تصدير PDF'}
             </Button>
           }
         />

        <Tabs defaultValue="operations" dir="rtl">
          <TabsList className="mb-4">
            <TabsTrigger value="operations" className="gap-2">
              <Activity className="w-4 h-4" />
              سجل العمليات
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-2">
              <ShieldAlert className="w-4 h-4" />
              محاولات الوصول
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <Archive className="w-4 h-4" />
              الأرشيف
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operations">
            {/* Stats */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" />إجمالي العمليات</CardTitle></CardHeader>
                  <CardContent><p className="text-2xl font-bold">{totalCount}</p></CardContent>
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
                    <SelectItem value="properties">العقارات</SelectItem>
                    <SelectItem value="contracts">العقود</SelectItem>
                    <SelectItem value="beneficiaries">المستفيدين</SelectItem>
                    <SelectItem value="units">الوحدات</SelectItem>
                    <SelectItem value="fiscal_years">السنوات المالية</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={opFilter} onValueChange={v => { setOpFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="العملية" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العمليات</SelectItem>
                    <SelectItem value="INSERT">إضافة</SelectItem>
                    <SelectItem value="UPDATE">تعديل</SelectItem>
                    <SelectItem value="DELETE">حذف</SelectItem>
                    <SelectItem value="REOPEN">إعادة فتح</SelectItem>
                    <SelectItem value="CLOSE">إقفال</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <TableSkeleton rows={5} cols={4} />
                  ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">لا توجد سجلات</div>
                  ) : (
                    <>
                      {/* Mobile Cards */}
                      <div className="block md:hidden space-y-3 p-3">
                        {paginated.map(log => {
                          const isExpanded = expandedRows.has(log.id);
                          const summary = log.operation === 'INSERT'
                            ? `إضافة سجل جديد في ${getTableNameAr(log.table_name)}`
                            : log.operation === 'DELETE'
                              ? `حذف سجل من ${getTableNameAr(log.table_name)}`
                              : log.operation === 'REOPEN'
                                ? `إعادة فتح ${getTableNameAr(log.table_name)}`
                                : `تعديل سجل في ${getTableNameAr(log.table_name)}`;
                          return (
                            <Card key={log.id} className="shadow-sm">
                              <CardContent className="p-3 space-y-2" onClick={() => toggleRow(log.id)}>
                                <div className="flex items-center justify-between">
                                  <Badge className={operationColor(log.operation)} variant="outline">
                                    {getOperationNameAr(log.operation)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('ar-SA')}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium">{getTableNameAr(log.table_name)}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">{summary}</p>
                                {isExpanded && (
                                  <div className="pt-2 border-t">
                                    <DataDiff
                                      oldData={log.old_data as Record<string, unknown> | null}
                                      newData={log.new_data as Record<string, unknown> | null}
                                      operation={log.operation}
                                    />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      {/* Desktop Table */}
                      <div className="overflow-x-auto hidden md:block">
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
                          {paginated.map(log => {
                            const isExpanded = expandedRows.has(log.id);
                            const summary = log.operation === 'INSERT'
                              ? `إضافة سجل جديد في ${getTableNameAr(log.table_name)}`
                              : log.operation === 'DELETE'
                                ? `حذف سجل من ${getTableNameAr(log.table_name)}`
                                : log.operation === 'REOPEN'
                                  ? `إعادة فتح ${getTableNameAr(log.table_name)}`
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
                      </div>
                      <TablePagination
                        currentPage={currentPage}
                        totalItems={totalCount}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="access">
            <AccessLogTab />
          </TabsContent>

          <TabsContent value="archive">
            <ArchiveLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogPage;
