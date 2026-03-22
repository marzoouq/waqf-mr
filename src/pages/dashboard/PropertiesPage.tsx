import { useState, useMemo } from 'react';
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
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/useProperties';
import { StatsGridSkeleton } from '@/components/SkeletonLoaders';
import { useAllUnits } from '@/hooks/useUnits';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { Property } from '@/types/database';
import { Plus, Edit, Trash2, Building2, MapPin, Ruler, Search, Home, DoorOpen, AlertTriangle } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { generatePropertiesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PropertyUnitsDialog from '@/components/properties/PropertyUnitsDialog';
import PropertySummaryCards from '@/components/properties/PropertySummaryCards';
import { fmt, fmtInt } from '@/utils/format';

const PropertiesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: properties = [], isLoading } = useProperties();
  const { fiscalYearId, fiscalYear } = useFiscalYear();
  const isSpecificYear = fiscalYearId !== 'all';
  const isClosed = fiscalYear?.status === 'closed';

  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpensesByFiscalYear(fiscalYearId);
  // بيانات الحساب الختامي للسنة المغلقة
  const { accounts } = useFinancialSummary(fiscalYearId, fiscalYear?.label, { fiscalYearStatus: fiscalYear?.status });
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  const [isOpen, setIsOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  // P-8: فلاتر إضافية
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<string>('all');
  const ITEMS_PER_PAGE = 9;
  const [formData, setFormData] = useState({
    property_number: '', property_type: '', location: '', area: '', description: '', vat_exempt: false,
  });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const summaryLoading = isLoading || contractsLoading || unitsLoading || expensesLoading;

  const summary = useMemo(() => {
    const totalProperties = properties.length;
    const totalUnitsCount = allUnits.length;
    // حساب الوحدات المؤجرة بناءً على العقود النشطة فقط (لتجنب احتساب عقود منتهية/ملغاة)
    const rentedUnitIds = new Set(contracts.filter(c => c.status === 'active' && c.unit_id).map(c => c.unit_id));
    const wholePropertyIds = new Set(contracts.filter(c => c.status === 'active' && !c.unit_id).map(c => c.property_id));

    let totalRented = 0;
    let totalVacant = 0;
    properties.forEach(p => {
      const pUnits = allUnits.filter(u => u.property_id === p.id);
      if (pUnits.length > 0) {
        const r = pUnits.filter(u => rentedUnitIds.has(u.id)).length;
        totalRented += wholePropertyIds.has(p.id) ? pUnits.length : r;
        totalVacant += wholePropertyIds.has(p.id) ? 0 : pUnits.length - r;
      } else if (wholePropertyIds.has(p.id)) {
        totalRented += 1;
      } else {
        totalVacant += 1;
      }
    });

    const occupancyBase = totalRented + totalVacant;
    const overallOccupancy = occupancyBase > 0 ? Math.round((totalRented / occupancyBase) * 100) : 0;
    const contractualRevenue = contracts.reduce((s, c) => s + Number(c.rent_amount), 0);

    // في السنة المغلقة: استخدم بيانات الحساب الختامي بدلاً من العقود النشطة
    const currentAccount = accounts?.[0];
    let activeIncome: number;
    let totalExpensesCalc: number;
    if (isClosed && currentAccount) {
      activeIncome = Number(currentAccount.total_income) || 0;
      totalExpensesCalc = Number(currentAccount.total_expenses) || 0;
    } else {
      activeIncome = contracts.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.rent_amount), 0);
      // F2/F11: حساب المصروفات المرتبطة بالعقارات فقط (لا كل المصروفات)
      totalExpensesCalc = expenses.filter(e => e.property_id).reduce((s, e) => s + Number(e.amount), 0);
    }
    const netIncome = activeIncome - totalExpensesCalc;

    return { totalProperties, totalUnitsCount, totalRented, totalVacant, overallOccupancy, contractualRevenue, activeIncome, totalExpensesAll: totalExpensesCalc, netIncome, isClosed: !!isClosed };
  }, [properties, allUnits, contracts, expenses, isClosed, accounts]);

  const resetForm = () => {
    setFormData({ property_number: '', property_type: '', location: '', area: '', description: '', vat_exempt: false });
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_number || !formData.property_type || !formData.location || !formData.area) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const propertyData = {
      property_number: formData.property_number, property_type: formData.property_type,
      location: formData.location, area: parseFloat(formData.area), description: formData.description || undefined,
      vat_exempt: formData.vat_exempt,
    };
    try {
      if (editingProperty) {
        await updateProperty.mutateAsync({ id: editingProperty.id, ...propertyData });
      } else {
        await createProperty.mutateAsync(propertyData);
      }
      setIsOpen(false);
      resetForm();
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const handleEdit = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProperty(property);
    setFormData({
      property_number: property.property_number, property_type: property.property_type,
      location: property.location, area: property.area.toString(), description: property.description || '',
      vat_exempt: property.vat_exempt ?? false,
    });
    setIsOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProperty.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  // P-8: أنواع العقارات الفريدة
  const uniqueTypes = useMemo(() => {
    const types = new Set(properties.map(p => p.property_type));
    return Array.from(types).sort();
  }, [properties]);

  // حساب نسبة الإشغال لكل عقار (لاستخدامها في الفلتر)
  const propertyOccupancy = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of properties) {
      const pUnits = allUnits.filter(u => u.property_id === p.id);
      const propContracts = contracts.filter(c => c.property_id === p.id);
      const rentedIds = new Set(propContracts.filter(c => (isSpecificYear || c.status === 'active') && c.unit_id).map(c => c.unit_id));
      const hasWhole = propContracts.some(c => (isSpecificYear || c.status === 'active') && !c.unit_id);
      const total = pUnits.length;
      if (total > 0) {
        const rented = hasWhole && rentedIds.size === 0 ? total : pUnits.filter(u => rentedIds.has(u.id)).length;
        map.set(p.id, Math.round((rented / total) * 100));
      } else {
        map.set(p.id, hasWhole ? 100 : 0);
      }
    }
    return map;
  }, [properties, allUnits, contracts, isSpecificYear]);

  const filteredProperties = properties.filter((p) => {
    // بحث نصي
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.property_number.toLowerCase().includes(q) && !p.property_type.toLowerCase().includes(q) &&
        !p.location.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
    }
    // P-8: فلتر النوع
    if (typeFilter !== 'all' && p.property_type !== typeFilter) return false;
    // P-8: فلتر الإشغال
    if (occupancyFilter !== 'all') {
      const occ = propertyOccupancy.get(p.id) ?? 0;
      if (occupancyFilter === 'full' && occ < 100) return false;
      if (occupancyFilter === 'partial' && (occ <= 0 || occ >= 100)) return false;
      if (occupancyFilter === 'empty' && occ > 0) return false;
    }
    return true;
  });

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
                    <Button type="submit" className="flex-1 gradient-primary" disabled={createProperty.isPending || updateProperty.isPending}>{editingProperty ? 'تحديث' : 'إضافة'}</Button>
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
          {/* P-8: فلتر نوع العقار */}
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
          {/* P-8: فلتر نسبة الإشغال */}
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
              const propertyUnits = allUnits.filter(u => u.property_id === property.id);
              const propContracts = contracts.filter(c => c.property_id === property.id);
              const rentedUnitIdsForProp = new Set(propContracts.filter(c => (isSpecificYear || c.status === 'active') && c.unit_id).map(c => c.unit_id));
              const hasWholePropertyContract = propContracts.some(c => (isSpecificYear || c.status === 'active') && !c.unit_id);
              const totalUnits = propertyUnits.length;
              const isWholePropertyRented = totalUnits === 0 && hasWholePropertyContract;
              const unitBasedRented = propertyUnits.filter(u => rentedUnitIdsForProp.has(u.id)).length;
              const rented = (totalUnits > 0 && hasWholePropertyContract && unitBasedRented === 0)
                ? totalUnits
                : (isWholePropertyRented ? totalUnits : unitBasedRented);
              const vacant = totalUnits - rented;
              const maintenance = propertyUnits.filter(u => u.status === 'صيانة' && !rentedUnitIdsForProp.has(u.id) && !isWholePropertyRented).length;
              const statusMismatch = propertyUnits.filter(u =>
                (u.status === 'مؤجرة' && !rentedUnitIdsForProp.has(u.id) && !hasWholePropertyContract) ||
                (u.status === 'شاغرة' && rentedUnitIdsForProp.has(u.id))
              ).length;
              const occupancy = totalUnits > 0
                ? Math.round((rented / totalUnits) * 100)
                : isWholePropertyRented ? 100 : 0;

              const allPropertyContracts = contracts.filter(c => c.property_id === property.id);
              const contractualRevenue = allPropertyContracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);
              const activeContracts = allPropertyContracts.filter(c => c.status === 'active');
              const activeAnnualRent = activeContracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);
              const monthlyRent = allPropertyContracts.reduce((sum, c) => {
                const rent = Number(c.rent_amount);
                if (c.payment_type === 'monthly') return sum + (Number(c.payment_amount) || rent / 12);
                return sum + rent / 12;
              }, 0);

              const propExpenses = expenses.filter(e => e.property_id === property.id);
              const totalExpenses = propExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
              const netIncome = contractualRevenue - totalExpenses;

              const occupancyColor = occupancy >= 80 ? 'text-success' : occupancy >= 50 ? 'text-warning' : 'text-destructive';
              const progressColor = occupancy >= 80 ? '[&>div]:bg-success' : occupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';

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
                    ) : activeContracts.length > 0 ? (
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
                    <div className="flex justify-between"><span className="text-muted-foreground">الشهري:</span><span className="font-medium">{fmtInt(monthlyRent)} ريال</span></div>
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
            })}
          </div>
          <TablePagination currentPage={currentPage} totalItems={filteredProperties.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
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
