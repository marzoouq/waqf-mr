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
import { TableSkeleton } from '@/components/SkeletonLoaders';
import AccessLogTab from '@/components/audit/AccessLogTab';
import ArchiveLogTab from '@/components/audit/ArchiveLogTab';
import { operationColor, DataDiff } from '@/components/audit/AuditLogHelpers';
import TablePagination from '@/components/TablePagination';
import { useAuditLogPage, getTableNameAr, getOperationNameAr } from '@/hooks/page/useAuditLogPage';

const AuditLogPage = () => {
  const h = useAuditLogPage();

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
         <PageHeaderCard
           title="سجل المراجعة"
           icon={ShieldCheck}
           description="تتبع جميع العمليات والتغييرات على النظام"
           actions={
             <Button variant="outline" size="sm" onClick={h.handleExportPdf} disabled={h.exporting || h.logs.length === 0} className="gap-2">
               <FileDown className="w-4 h-4" />{h.exporting ? 'جاري التصدير...' : 'تصدير PDF'}
             </Button>
           }
         />

        <Tabs value={h.activeTab} onValueChange={h.setActiveTab} dir="rtl">
          <div className="mb-4 md:hidden">
            <Select value={h.activeTab} onValueChange={h.setActiveTab}>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4" />إجمالي العمليات</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{h.totalCount}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4" />عمليات اليوم</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{h.todayCount}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" />آخر عملية</CardTitle></CardHeader><CardContent><p className="text-sm font-medium">{h.logs[0] ? new Date(h.logs[0].created_at).toLocaleString('ar-SA') : '—'}</p></CardContent></Card>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="searchQuery" placeholder="بحث..." value={h.searchQuery} onChange={e => { h.setSearchQuery(e.target.value); h.setCurrentPage(1); }} className="pr-9" />
                  </div>
                  <div className="flex gap-3">
                    <Select value={h.tableFilter} onValueChange={v => { h.setTableFilter(v); h.setCurrentPage(1); }}>
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
                    <Select value={h.opFilter} onValueChange={v => { h.setOpFilter(v); h.setCurrentPage(1); }}>
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
                    <Input type="date" value={h.dateFrom} onChange={e => { h.setDateFrom(e.target.value); h.setCurrentPage(1); }} className="w-[160px]" aria-label="تاريخ البداية" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">إلى:</span>
                    <Input type="date" value={h.dateTo} onChange={e => { h.setDateTo(e.target.value); h.setCurrentPage(1); }} className="w-[160px]" aria-label="تاريخ النهاية" />
                  </div>
                  {h.hasDateFilter && (
                    <Button variant="ghost" size="sm" onClick={h.clearDateFilters} className="gap-1 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />مسح التاريخ
                    </Button>
                  )}
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {h.isLoading ? (
                    <TableSkeleton rows={5} cols={4} />
                  ) : h.logs.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">لا توجد سجلات</div>
                  ) : (
                    <>
                      <div className="block md:hidden space-y-3 p-3">
                        {h.logs.map(log => (
                          <Collapsible key={log.id} open={h.expandedRows.has(log.id)} onOpenChange={() => h.toggleRow(log.id)}>
                            <Card className="shadow-sm">
                              <CollapsibleTrigger asChild>
                                <CardContent className="p-3 space-y-2 cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <Badge className={operationColor(log.operation)} variant="outline">{getOperationNameAr(log.operation)}</Badge>
                                    <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('ar-SA')}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{getTableNameAr(log.table_name)}</span>
                                    <span className="h-6 w-6 flex items-center justify-center">{h.expandedRows.has(log.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{h.getSummary(log)}</p>
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
                          {h.logs.map(log => {
                            const isExpanded = h.expandedRows.has(log.id);
                            return (
                              <Collapsible key={log.id} open={isExpanded} onOpenChange={() => h.toggleRow(log.id)} asChild>
                                <>
                                  <CollapsibleTrigger asChild>
                                    <TableRow className="cursor-pointer hover:bg-muted/50">
                                      <TableCell><Button variant="ghost" size="icon" className="h-6 w-6">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button></TableCell>
                                      <TableCell className="text-sm">{new Date(log.created_at).toLocaleString('ar-SA')}</TableCell>
                                      <TableCell>{getTableNameAr(log.table_name)}</TableCell>
                                      <TableCell><Badge className={operationColor(log.operation)} variant="outline">{getOperationNameAr(log.operation)}</Badge></TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{h.getSummary(log)}</TableCell>
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
                      <TablePagination currentPage={h.currentPage} totalItems={h.totalCount} itemsPerPage={h.ITEMS_PER_PAGE} onPageChange={h.setCurrentPage} />
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
