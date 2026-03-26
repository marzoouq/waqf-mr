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
import { ShieldCheck, ChevronDown, ChevronUp, Search, Activity, Clock, CalendarDays, ShieldAlert, Archive, FileDown, X } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog, getTableNameAr, getOperationNameAr } from '@/hooks/data/useAuditLog';
import TablePagination from '@/components/TablePagination';
import { TableSkeleton } from '@/components/SkeletonLoaders';
import AccessLogTab from '@/components/audit/AccessLogTab';
import ArchiveLogTab from '@/components/audit/ArchiveLogTab';
import { generateAuditLogPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { toast } from 'sonner';
import { operationColor, DataDiff } from '@/components/audit/AuditLogHelpers';

const ITEMS_PER_PAGE = 15;

const AuditLogPage = () => {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('operations');
  const [exporting, setExporting] = useState(false);
  
  const waqfInfo = usePdfWaqfInfo();
  const hasDateFilter = dateFrom !== '' || dateTo !== '';

  const clearDateFilters = () => {
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const { data: auditData, isLoading } = useAuditLog({
    tableName: tableFilter !== 'all' ? tableFilter : undefined,
    operation: opFilter !== 'all' ? opFilter : undefined,
    searchQuery: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
  });

  const logs = auditData?.logs ?? [];
  const totalCount = auditData?.totalCount ?? 0;
  const paginated = logs;
  const filtered = logs;

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
      let exportQuery = supabase
        .from('audit_log')
        .select('id, table_name, operation, record_id, old_data, new_data, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (tableFilter !== 'all') exportQuery = exportQuery.eq('table_name', tableFilter);
      if (opFilter !== 'all') exportQuery = exportQuery.eq('operation', opFilter);
      if (dateFrom) exportQuery = exportQuery.gte('created_at', dateFrom);
      if (dateTo) exportQuery = exportQuery.lte('created_at', dateTo + 'T23:59:59');
      const { data: allLogs } = await exportQuery;
      await generateAuditLogPDF({
        logs: (allLogs as unknown as typeof filtered) || filtered,
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

  const getSummary = (log: typeof logs[0]) => {
    return log.operation === 'INSERT'
      ? `إضافة سجل جديد في ${getTableNameAr(log.table_name)}`
      : log.operation === 'DELETE'
        ? `حذف سجل من ${getTableNameAr(log.table_name)}`
        : log.operation === 'REOPEN'
          ? `إعادة فتح ${getTableNameAr(log.table_name)}`
          : `تعديل سجل في ${getTableNameAr(log.table_name)}`;
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
         <PageHeaderCard
           title="سجل المراجعة"
           icon={ShieldCheck}
           description="تتبع جميع العمليات والتغييرات على النظام"
           actions={
             <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting || filtered.length === 0} className="gap-2">
               <FileDown className="w-4 h-4" />
               {exporting ? 'جاري التصدير...' : 'تصدير PDF'}
             </Button>
           }
         />

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <div className="mb-4 md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operations">سجل العمليات</SelectItem>
                <SelectItem value="access">محاولات الوصول</SelectItem>
                <SelectItem value="archive">الأرشيف</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="mb-4 hidden md:inline-flex">
            <TabsTrigger value="operations" className="gap-2"><Activity className="w-4 h-4" />سجل العمليات</TabsTrigger>
            <TabsTrigger value="access" className="gap-2"><ShieldAlert className="w-4 h-4" />محاولات الوصول</TabsTrigger>
            <TabsTrigger value="archive" className="gap-2"><Archive className="w-4 h-4" />الأرشيف</TabsTrigger>
          </TabsList>

          <TabsContent value="operations">
            <div className="space-y-6">
              {/* بطاقات الإحصائيات */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" />إجمالي العمليات</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalCount}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4" />عمليات اليوم</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{todayCount}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />آخر عملية</CardTitle></CardHeader><CardContent><p className="text-sm font-medium">{logs[0] ? new Date(logs[0].created_at).toLocaleString('ar-SA') : '—'}</p></CardContent></Card>
              </div>

              {/* الفلاتر */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="searchQuery" placeholder="بحث..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-9" />
                  </div>
                  <div className="flex gap-3">
                    <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="flex-1 sm:w-[160px]"><SelectValue placeholder="الجدول" /></SelectTrigger>
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
                      <SelectTrigger className="flex-1 sm:w-[140px]"><SelectValue placeholder="العملية" /></SelectTrigger>
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
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">من:</span>
                    <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} className="w-[160px]" aria-label="تاريخ البداية" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">إلى:</span>
                    <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} className="w-[160px]" aria-label="تاريخ النهاية" />
                  </div>
                  {hasDateFilter && (
                    <Button variant="ghost" size="sm" onClick={clearDateFilters} className="gap-1 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />مسح التاريخ
                    </Button>
                  )}
                </div>
              </div>

              {/* الجدول */}
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <TableSkeleton rows={5} cols={4} />
                  ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">لا توجد سجلات</div>
                  ) : (
                    <>
                      {/* بطاقات الموبايل */}
                      <div className="block md:hidden space-y-3 p-3">
                        {paginated.map(log => (
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
                                    <span className="h-6 w-6 flex items-center justify-center">
                                      {expandedRows.has(log.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </span>
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
                      {/* جدول سطح المكتب */}
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
                                        <Badge className={operationColor(log.operation)} variant="outline">{getOperationNameAr(log.operation)}</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{getSummary(log)}</TableCell>
                                    </TableRow>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent asChild>
                                    <tr>
                                      <td colSpan={5} className="bg-muted/30 p-4 border-b">
                                        <DataDiff oldData={log.old_data as Record<string, unknown> | null} newData={log.new_data as Record<string, unknown> | null} operation={log.operation} />
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
                      <TablePagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="access"><AccessLogTab /></TabsContent>
          <TabsContent value="archive"><ArchiveLogTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogPage;
