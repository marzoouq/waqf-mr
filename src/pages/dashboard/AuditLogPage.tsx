import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Activity, ShieldAlert, Archive, FileDown } from 'lucide-react';
import AccessLogTab from '@/components/audit/AccessLogTab';
import ArchiveLogTab from '@/components/audit/ArchiveLogTab';
import AuditLogStats from '@/components/audit/AuditLogStats';
import AuditLogFilters from '@/components/audit/AuditLogFilters';
import AuditLogTable from '@/components/audit/AuditLogTable';
import { useAuditLogPage } from '@/hooks/page/admin/management/useAuditLogPage';

const AuditLogPage = () => {
  const isMobile = useIsMobile();
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
          {isMobile ? (
            <div className="mb-4">
              <Select value={h.activeTab} onValueChange={h.setActiveTab}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">سجل العمليات</SelectItem>
                  <SelectItem value="access">محاولات الوصول</SelectItem>
                  <SelectItem value="archive">الأرشيف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <TabsList className="mb-4">
              <TabsTrigger value="operations" className="gap-2"><Activity className="w-4 h-4" />سجل العمليات</TabsTrigger>
              <TabsTrigger value="access" className="gap-2"><ShieldAlert className="w-4 h-4" />محاولات الوصول</TabsTrigger>
              <TabsTrigger value="archive" className="gap-2"><Archive className="w-4 h-4" />الأرشيف</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="operations">
            <div className="space-y-6">
              <AuditLogStats
                totalCount={h.totalCount}
                todayCount={h.todayCount}
                lastOperationDate={h.logs[0]?.created_at ?? null}
              />

              <AuditLogFilters
                searchQuery={h.searchQuery}
                setSearchQuery={h.setSearchQuery}
                tableFilter={h.tableFilter}
                setTableFilter={h.setTableFilter}
                opFilter={h.opFilter}
                setOpFilter={h.setOpFilter}
                dateFrom={h.dateFrom}
                setDateFrom={h.setDateFrom}
                dateTo={h.dateTo}
                setDateTo={h.setDateTo}
                hasDateFilter={h.hasDateFilter}
                clearDateFilters={h.clearDateFilters}
                setCurrentPage={h.setCurrentPage}
              />

              <Card>
                <CardContent className="p-0">
                  <AuditLogTable
                    logs={h.logs}
                    isLoading={h.isLoading}
                    isMobile={isMobile}
                    expandedRows={h.expandedRows}
                    toggleRow={h.toggleRow}
                    getSummary={h.getSummary}
                    currentPage={h.currentPage}
                    totalCount={h.totalCount}
                    itemsPerPage={h.ITEMS_PER_PAGE}
                    setCurrentPage={h.setCurrentPage}
                  />
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
