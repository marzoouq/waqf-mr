import { ErrorState } from '@/components/common';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search } from 'lucide-react';
import { ExportMenu, TablePagination, ConfirmDeleteDialog } from '@/components/common';
import { BeneficiaryFormDialog, BeneficiaryCard, BeneficiariesSummaryCards } from '@/components/beneficiaries/admin';
import { AdvanceRequestsTab } from '@/components/accounts';
import { useBeneficiariesPage } from '@/hooks/page/admin/management/useBeneficiariesPage';

const BeneficiariesPage = () => {
  const h = useBeneficiariesPage();

  if (h.isError) return <ErrorState message="تعذّر تحميل البيانات" description="تحقق من الاتصال ثم حدّث الصفحة. لم تُعرض أرقام ناقصة حتى لا تُفهم خطأً." />;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة المستفيدين"
          icon={Users}
          description="عرض وإدارة المستفيدين من الوقف"
          actions={<>
            <ExportMenu onExportPdf={h.handleExportPdf} onExportCsv={h.handleExportCsv} />
            <BeneficiaryFormDialog
              isOpen={h.isOpen} setIsOpen={h.setIsOpen} formData={h.formData} setFormData={h.setFormData}
              isEditing={!!h.editingBeneficiary} isPending={h.isPending}
              availableUsers={h.availableUsers} onSubmit={h.handleSubmit} onReset={h.resetForm}
            />
          </>}
        />

        <Tabs defaultValue="beneficiaries" dir="rtl">
          <TabsList aria-label="عرض المستفيدين" className="w-full sm:w-auto">
            <TabsTrigger value="beneficiaries">المستفيدون</TabsTrigger>
            <TabsTrigger value="advances">طلبات السُلف</TabsTrigger>
          </TabsList>

          <TabsContent value="beneficiaries" className="space-y-5 mt-4">
            <BeneficiariesSummaryCards
              isLoading={h.isLoading} total={h.beneficiaries.length} active={h.activeBeneficiaries}
              totalPercentage={h.totalPercentage} percentageExceeds={h.percentageExceeds}
            />

            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="beneficiaries-search" name="beneficiaries-search" aria-label="بحث" placeholder="بحث في المستفيدين..." value={h.searchQuery} onChange={(e) => { h.setSearchQuery(e.target.value); h.setCurrentPage(1); }} className="ps-10" />
            </div>

            {h.isLoading ? (
              <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
            ) : h.filteredBeneficiaries.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{h.searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مستفيدين مسجلين'}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {h.paginatedBeneficiaries.map((beneficiary) => (
                    <BeneficiaryCard
                      key={beneficiary.id}
                      beneficiary={beneficiary}
                      onEdit={h.handleEdit}
                      onDelete={(id, name) => h.setDeleteTarget({ id, name })}
                    />
                  ))}
                </div>
                <TablePagination currentPage={h.currentPage} totalItems={h.filteredBeneficiaries.length} itemsPerPage={h.ITEMS_PER_PAGE} onPageChange={h.setCurrentPage} />
              </>
            )}
          </TabsContent>

          <TabsContent value="advances" className="mt-4">
            <AdvanceRequestsTab />
          </TabsContent>
        </Tabs>

        <ConfirmDeleteDialog
          open={!!h.deleteTarget}
          onOpenChange={(open) => !open && h.setDeleteTarget(null)}
          targetName={h.deleteTarget?.name}
          onConfirm={h.handleConfirmDelete}
        />
      </div>
    </DashboardLayout>
  );
};

export default BeneficiariesPage;
