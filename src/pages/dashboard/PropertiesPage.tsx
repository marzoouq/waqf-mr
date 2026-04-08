
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { TablePagination, CrudPagination, ExportMenu, StatsGridSkeleton } from '@/components/common';
import { Building2, Search } from 'lucide-react';
import { generatePropertiesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { PropertyUnitsDialog, PropertySummaryCards, PropertyFormDialog, PropertyCard, PropertyDeleteDialog } from '@/components/properties';
import { usePropertiesPage } from '@/hooks/page/admin/settings/usePropertiesPage';

const PropertiesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const {
    properties, isLoading, contracts, isSpecificYear,
    summaryLoading, summary, propertyFinancialsMap,
    isOpen, setIsOpen, editingProperty, formData, setFormData,
    resetForm, handleEdit, handleSubmit,
    createPending, updatePending,
    deleteTarget, setDeleteTarget, handleConfirmDelete,
    searchQuery, setSearchQuery, typeFilter, setTypeFilter,
    occupancyFilter, setOccupancyFilter, uniqueTypes,
    currentPage, setCurrentPage, ITEMS_PER_PAGE,
    serverPage, serverNextPage, serverPrevPage, serverHasNextPage, serverHasPrevPage, serverPageSize,
    selectedProperty, setSelectedProperty,
    filteredProperties,
  } = usePropertiesPage();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="إدارة العقارات"
          icon={Building2}
          description="عرض وإدارة جميع عقارات الوقف"
          actions={<>
            <ExportMenu onExportPdf={() => generatePropertiesPDF(properties, pdfWaqfInfo)} />
            <PropertyFormDialog
              isOpen={isOpen} setIsOpen={setIsOpen} editingProperty={editingProperty}
              formData={formData} setFormData={setFormData} resetForm={resetForm}
              handleSubmit={handleSubmit} createPending={createPending} updatePending={updatePending}
            />
          </>}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="properties-search" name="properties-search" aria-label="بحث" placeholder="بحث في العقارات..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pr-10" />
          </div>
          {uniqueTypes.length > 1 && (
            <NativeSelect
              value={typeFilter}
              onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'كل الأنواع' },
                ...uniqueTypes.map(t => ({ value: t, label: t })),
              ]}
            />
          )}
          <NativeSelect
            value={occupancyFilter}
            onValueChange={(v) => { setOccupancyFilter(v); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'كل الإشغالات' },
              { value: 'full', label: 'مشغول بالكامل' },
              { value: 'partial', label: 'مشغول جزئياً' },
              { value: 'empty', label: 'شاغر' },
            ]}
          />
        </div>

        <PropertySummaryCards summary={summary} isLoading={summaryLoading} />

        {isLoading ? (
          <StatsGridSkeleton count={6} />
        ) : filteredProperties.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد عقارات مسجلة'}</p>
            </CardContent>
          </Card>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((property) => {
              const pf = propertyFinancialsMap.get(property.id);
              const hasActiveContracts = contracts.some(c => c.property_id === property.id && (isSpecificYear || c.status === 'active'));

              return (
                <PropertyCard
                  key={property.id}
                  property={property}
                  financials={pf!}
                  hasActiveContracts={hasActiveContracts}
                  onSelect={setSelectedProperty}
                  onEdit={handleEdit}
                  onDelete={(id, name) => setDeleteTarget({ id, name })}
                />
              );
            })}
          </div>
          <TablePagination currentPage={currentPage} totalItems={filteredProperties.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
          <CrudPagination
            page={serverPage}
            pageSize={serverPageSize}
            currentCount={properties.length}
            hasNextPage={serverHasNextPage}
            hasPrevPage={serverHasPrevPage}
            nextPage={serverNextPage}
            prevPage={serverPrevPage}
            isLoading={isLoading}
          />
          </>
        )}

        {selectedProperty && (
          <PropertyUnitsDialog property={selectedProperty} contracts={contracts} onClose={() => setSelectedProperty(null)} />
        )}

        <PropertyDeleteDialog
          deleteTarget={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </DashboardLayout>
  );
};

export default PropertiesPage;
