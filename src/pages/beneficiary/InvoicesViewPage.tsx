import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvoiceViewer, InvoiceGridView, InvoicesViewMobileCards, InvoicesViewDesktopTable } from '@/components/invoices';
import { FileText, Search, LayoutGrid, List, Info } from 'lucide-react';
import { ExportMenu, TablePagination, RequirePublishedYears, TableSkeleton, ErrorState } from '@/components/common';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useInvoicesViewPage } from '@/hooks/page/beneficiary';
import { INVOICES_SCOPE_COPY } from '@/constants/beneficiaryCopy';

const InvoicesViewPage = () => {
  const { noPublishedYears } = useFiscalYear();
  const {
    isLoading, isError, isMobile,
    viewMode, setViewMode,
    searchQuery, handleSearchChange,
    sourceFilter, handleSourceFilterChange,
    currentPage, setCurrentPage, ITEMS_PER_PAGE,
    filteredInvoices, paginatedInvoices,
    statusBadgeVariant,
    viewerFile, setViewerFile,
    handleRetry, handleDownloadPDF,
  } = useInvoicesViewPage();

  // B2: حارس السنوات المنشورة قبل أي فرع
  if (noPublishedYears) {
    return <RequirePublishedYears title={INVOICES_SCOPE_COPY.title} icon={FileText} description={INVOICES_SCOPE_COPY.description}><></></RequirePublishedYears>;
  }

  // B14: ErrorState الموحّد
  if (isError) {
    return <ErrorState message="حدث خطأ أثناء تحميل الفواتير" onRetry={handleRetry} />;
  }

  return (
    <RequirePublishedYears title={INVOICES_SCOPE_COPY.title} icon={FileText} description={INVOICES_SCOPE_COPY.description}>
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title={INVOICES_SCOPE_COPY.title}
          description={INVOICES_SCOPE_COPY.description}
          icon={FileText}
          actions={<ExportMenu onExportPdf={handleDownloadPDF} />}
        />

        <Card className="shadow-sm border-info/30 bg-info/5">
          <CardContent className="p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{INVOICES_SCOPE_COPY.context}</p>
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-end">
          <div className="flex gap-1 border rounded-lg p-1">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="gap-1">
              <List className="w-4 h-4" /><span className="hidden sm:inline">جدول</span>
            </Button>
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="gap-1">
              <LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">شبكي</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs value={sourceFilter} onValueChange={(v) => handleSourceFilterChange(v as 'all' | 'purchase' | 'rent')}>
            <TabsList aria-label="تصنيف الفواتير">
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="rent">فواتير الإيجار</TabsTrigger>
              <TabsTrigger value="purchase">فواتير الشراء</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input name="searchQuery" placeholder="بحث في الفواتير..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="ps-10" />
          </div>
        </div>

        {viewMode === 'grid' ? (
          isLoading ? <TableSkeleton rows={4} cols={3} /> : <InvoiceGridView invoices={filteredInvoices} readOnly />
        ) : (
          <>
            {isMobile ? (
              isLoading ? (
                <TableSkeleton rows={4} cols={2} />
              ) : (
                <>
                  <InvoicesViewMobileCards invoices={paginatedInvoices} statusBadgeVariant={statusBadgeVariant} onViewFile={setViewerFile} />
                  <TablePagination currentPage={currentPage} totalItems={filteredInvoices.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
                </>
              )
            ) : (
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
                  ) : (
                    <InvoicesViewDesktopTable invoices={paginatedInvoices} statusBadgeVariant={statusBadgeVariant} onViewFile={setViewerFile} searchQuery={searchQuery} />
                  )}
                  <TablePagination currentPage={currentPage} totalItems={filteredInvoices.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
                </CardContent>
              </Card>
            )}
          </>
        )}
        <InvoiceViewer open={!!viewerFile} onOpenChange={(open) => !open && setViewerFile(null)} filePath={viewerFile?.path || null} fileName={viewerFile?.name || null} />
      </div>
    </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default InvoicesViewPage;
