import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Percent, Search, AlertTriangle, Wallet, UserCheck } from 'lucide-react';
import { ExportMenu, TablePagination, ConfirmDeleteDialog } from '@/components/common';
import { BeneficiaryFormDialog, BeneficiaryCard } from '@/components/beneficiary/admin';
import { AdvanceRequestsTab } from '@/components/accounts';
import { useBeneficiariesPage } from '@/hooks/page/admin/management/useBeneficiariesPage';

const BeneficiariesPage = () => {
  const h = useBeneficiariesPage();

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
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="beneficiaries">المستفيدون</TabsTrigger>
            <TabsTrigger value="advances">طلبات السُلف</TabsTrigger>
          </TabsList>

          <TabsContent value="beneficiaries" className="space-y-5 mt-4">
            {h.isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="shadow-sm">
                    <CardContent className="p-3 sm:p-6 flex items-center gap-2 sm:gap-4">
                      <Skeleton className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center"><Users className="w-4 h-4 sm:w-6 sm:h-6 text-primary" /></div>
                      <div><p className="text-[11px] sm:text-sm text-muted-foreground">إجمالي المستفيدين</p><p className="text-xl sm:text-3xl font-bold">{h.beneficiaries.length}</p></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 bg-success/10 rounded-xl flex items-center justify-center"><UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-success" /></div>
                      <div><p className="text-[11px] sm:text-sm text-muted-foreground">نشطون (نسبة {'>'} 0)</p><p className="text-xl sm:text-3xl font-bold text-success">{h.activeBeneficiaries}</p></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`shadow-sm ${h.percentageExceeds ? 'border-destructive/50' : ''}`}>
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className={`w-9 h-9 sm:w-12 sm:h-12 ${h.percentageExceeds ? 'bg-destructive/10' : 'bg-secondary/20'} rounded-xl flex items-center justify-center`}>
                        {h.percentageExceeds ? <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-destructive" /> : <Percent className="w-4 h-4 sm:w-6 sm:h-6 text-secondary" />}
                      </div>
                      <div>
                        <p className="text-[11px] sm:text-sm text-muted-foreground">مجموع النسب</p>
                        <p className={`text-xl sm:text-3xl font-bold ${h.percentageExceeds ? 'text-destructive' : ''}`}>{h.totalPercentage.toFixed(2)}%</p>
                        {h.percentageExceeds && <p className="text-[11px] text-destructive">تجاوز 100%!</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 bg-accent/20 rounded-xl flex items-center justify-center"><Wallet className="w-4 h-4 sm:w-6 sm:h-6 text-accent-foreground" /></div>
                      <div><p className="text-[11px] sm:text-sm text-muted-foreground">متوسط الحصة</p><p className="text-xl sm:text-3xl font-bold">{h.beneficiaries.length > 0 ? (h.totalPercentage / h.beneficiaries.length).toFixed(1) : 0}%</p></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="beneficiaries-search" name="beneficiaries-search" aria-label="بحث" placeholder="بحث في المستفيدين..." value={h.searchQuery} onChange={(e) => { h.setSearchQuery(e.target.value); h.setCurrentPage(1); }} className="pr-10" />
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
