import { computePropertyFinancials } from '@/hooks/financial/usePropertyFinancials';
import PropertyCard from '@/components/properties/PropertyCard';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StatsGridSkeleton } from '@/components/SkeletonLoaders';
import { Plus, Edit, Trash2, Building2, MapPin, Ruler, Search, Home, DoorOpen, AlertTriangle } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import TablePagination from '@/components/TablePagination';
import CrudPagination from '@/components/CrudPagination';
import ExportMenu from '@/components/ExportMenu';
import { generatePropertiesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PropertyUnitsDialog from '@/components/properties/PropertyUnitsDialog';
import PropertySummaryCards from '@/components/properties/PropertySummaryCards';
import { fmt, fmtInt } from '@/utils/format';
import { usePropertiesPage } from '@/hooks/page/usePropertiesPage';

const PropertiesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const {
    properties, isLoading, contracts, allUnits, expenses, isSpecificYear,
    allocationMap, summaryLoading, summary,
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
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2"><Plus className="w-4 h-4" />إضافة عقار</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingProperty ? 'تعديل العقار' : 'إضافة عقار جديد'}</DialogTitle>
                  <DialogDescription className="sr-only">نموذج إضافة أو تعديل عقار</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2"><Label htmlFor="property-number">رقم العقار *</Label><Input id="property-number" name="property-number" value={formData.property_number} onChange={(e) => setFormData({ ...formData, property_number: e.target.value })} placeholder="مثال: W-001" /></div>
                  <div className="space-y-2"><Label htmlFor="property-type">نوع العقار *</Label><Input id="property-type" name="property-type" value={formData.property_type} onChange={(e) => setFormData({ ...formData, property_type: e.target.value })} placeholder="شقة، محل تجاري، مبنى..." /></div>
                  <div className="space-y-2"><Label htmlFor="property-location">الموقع *</Label><Input id="property-location" name="property-location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="المدينة، الحي، الشارع" /></div>
                  <div className="space-y-2"><Label htmlFor="property-area">المساحة (م²) *</Label><Input id="property-area" name="property-area" type="number" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} placeholder="100" /></div>
                  <div className="space-y-2"><Label htmlFor="property-description">الوصف</Label><Input id="property-description" name="property-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف إضافي للعقار" /></div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">معفى من الضريبة (سكني)</Label>
                      <p className="text-xs text-muted-foreground">العقارات السكنية معفاة من VAT حسب نظام ZATCA</p>
                    </div>
                    <Switch checked={formData.vat_exempt} onCheckedChange={(checked) => setFormData({ ...formData, vat_exempt: checked })} />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={createPending || updatePending}>{editingProperty ? 'تحديث' : 'إضافة'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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
          {/* حساب المؤشرات المالية لكل عقار مرة واحدة بـ useMemo بدلاً من داخل render loop */}
          {(() => {
            // هذا الحساب يحدث مرة واحدة عند تغير البيانات
            const pageProperties = filteredProperties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
            return pageProperties.map((property) => {
              const pf = computePropertyFinancials({
                propertyId: property.id,
                contracts,
                expenses,
                units: allUnits,
                isSpecificYear,
                allocationMap,
              });
              const { totalUnits, rented, vacant, maintenance, statusMismatch, occupancy, occupancyColor, progressColor, monthlyRent, activeAnnualRent, totalExpenses, netIncome, contractualRevenue } = pf;

              return (
              <Card key={property.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProperty(property)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{property.property_number}</CardTitle>
                      {property.vat_exempt && (
                        <span className="text-[11px] bg-success/10 text-success px-1.5 py-0.5 rounded font-medium">معفى VAT</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => handleEdit(property, e)} aria-label="تعديل العقار"><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: property.id, name: `العقار ${property.property_number}` }); }} className="text-destructive hover:text-destructive" aria-label="حذف العقار"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{property.property_type}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{property.location}</span>
                    <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{property.area} م²</span>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    {totalUnits > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex gap-3 flex-wrap">
                            <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5 text-success" />مؤجرة: <strong>{rented}</strong></span>
                            <span className="flex items-center gap-1"><DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />شاغرة: <strong>{vacant}</strong></span>
                            {maintenance > 0 && <span className="flex items-center gap-1 text-destructive">صيانة: <strong>{maintenance}</strong></span>}
                            {statusMismatch > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center gap-1 text-warning cursor-help">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <strong>{statusMismatch}</strong>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{statusMismatch} وحدة بها تناقض بين الحالة والعقود - يرجى المراجعة</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <Progress value={occupancy} className={`h-2 flex-1 ${progressColor}`} />
                                <span className={`text-xs font-semibold ${occupancyColor}`}>{occupancy}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>مؤجرة: {rented} من {totalUnits} وحدة | شاغرة: {vacant}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : contracts.some(c => c.property_id === property.id && (isSpecificYear || c.status === 'active')) ? (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Home className="w-3.5 h-3.5 text-success" />
                          <span className="font-medium text-success">مؤجر بالكامل</span>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <Progress value={100} className="h-2 flex-1 [&>div]:bg-success" />
                                <span className="text-xs font-semibold text-success">100%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>العقار مؤجر بالكامل</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">لا توجد وحدات مسجلة</div>
                    )}
                  </div>

                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">الإيرادات التعاقدية:</span><span className="font-semibold">{fmt(contractualRevenue)} ريال</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">الدخل النشط:</span><span className="font-medium text-success">{fmt(activeAnnualRent)} ريال</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">الاستحقاق الشهري:</span><span className="font-medium">{fmtInt(monthlyRent)} ريال</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">المصروفات:</span><span className="font-medium">{fmt(totalExpenses)} ريال</span></div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="text-muted-foreground">الصافي:</span>
                      <span className={`font-bold ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(netIncome)} ريال</span>
                    </div>
                  </div>

                  <div className="border-t pt-2 mt-1 flex items-center gap-2 text-xs text-primary">
                    <DoorOpen className="w-3.5 h-3.5" /><span>اضغط لعرض الوحدات</span>
                  </div>
                </CardContent>
              </Card>
              );
            });
          })()}
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

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>سيتم حذف {deleteTarget?.name} نهائياً ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default PropertiesPage;
