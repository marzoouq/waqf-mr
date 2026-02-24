import { useState, useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/useProperties';
import { useAllUnits } from '@/hooks/useUnits';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Property } from '@/types/database';
import { Plus, Edit, Trash2, Building2, MapPin, Ruler, Search, Home, DoorOpen, Layers, TrendingUp, CircleDollarSign, Receipt, Wallet } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { generatePropertiesPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PropertyUnitsDialog from '@/components/properties/PropertyUnitsDialog';

const PropertiesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: properties = [], isLoading } = useProperties();
  const { fiscalYearId, isClosed } = useFiscalYear();

  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpensesByFiscalYear(fiscalYearId);
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  const [isOpen, setIsOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  const [formData, setFormData] = useState({
    property_number: '',
    property_type: '',
    location: '',
    area: '',
    description: '',
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const summaryLoading = isLoading || contractsLoading || unitsLoading || expensesLoading;

  // حساب الملخص الموحّد مع useMemo
  const summary = useMemo(() => {
    const totalProperties = properties.length;
    const totalUnitsCount = allUnits.length;

    const rentedUnitIds = new Set(contracts.filter(c => (isClosed || c.status === 'active') && c.unit_id).map(c => c.unit_id));
    const wholePropertyIds = new Set(contracts.filter(c => (isClosed || c.status === 'active') && !c.unit_id).map(c => c.property_id));

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
        // عقار بدون وحدات وبدون عقد = شاغر
        totalVacant += 1;
      }
    });

    const occupancyBase = totalRented + totalVacant;
    const overallOccupancy = occupancyBase > 0 ? Math.round((totalRented / occupancyBase) * 100) : 0;

    const contractualRevenue = contracts.reduce((s, c) => s + Number(c.rent_amount), 0);
    const activeIncome = contracts.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.rent_amount), 0);
    const totalExpensesAll = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netIncome = contractualRevenue - totalExpensesAll;

    return { totalProperties, totalUnitsCount, totalRented, totalVacant, overallOccupancy, contractualRevenue, activeIncome, totalExpensesAll, netIncome };
  }, [properties, allUnits, contracts, expenses]);

  const resetForm = () => {
    setFormData({ property_number: '', property_type: '', location: '', area: '', description: '' });
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_number || !formData.property_type || !formData.location || !formData.area) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const propertyData = {
      property_number: formData.property_number,
      property_type: formData.property_type,
      location: formData.location,
      area: parseFloat(formData.area),
      description: formData.description || undefined,
    };
    if (editingProperty) {
      await updateProperty.mutateAsync({ id: editingProperty.id, ...propertyData });
    } else {
      await createProperty.mutateAsync(propertyData);
    }
    setIsOpen(false);
    resetForm();
  };

  const handleEdit = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProperty(property);
    setFormData({
      property_number: property.property_number,
      property_type: property.property_type,
      location: property.location,
      area: property.area.toString(),
      description: property.description || '',
    });
    setIsOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteProperty.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const filteredProperties = properties.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.property_number.toLowerCase().includes(q) ||
      p.property_type.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q);
  });

  const occColor = summary.overallOccupancy >= 80 ? 'text-success' : summary.overallOccupancy >= 50 ? 'text-warning' : 'text-destructive';
  const occBarColor = summary.overallOccupancy >= 80 ? '[&>div]:bg-success' : summary.overallOccupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">إدارة العقارات</h1>
            <p className="text-muted-foreground mt-1 text-sm">عرض وإدارة جميع عقارات الوقف</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <ExportMenu onExportPdf={() => generatePropertiesPDF(properties, pdfWaqfInfo)} />
            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة عقار
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingProperty ? 'تعديل العقار' : 'إضافة عقار جديد'}</DialogTitle>
                  <DialogDescription className="sr-only">نموذج إضافة أو تعديل عقار</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>رقم العقار *</Label>
                    <Input value={formData.property_number} onChange={(e) => setFormData({ ...formData, property_number: e.target.value })} placeholder="مثال: W-001" />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع العقار *</Label>
                    <Input value={formData.property_type} onChange={(e) => setFormData({ ...formData, property_type: e.target.value })} placeholder="شقة، محل تجاري، مبنى..." />
                  </div>
                  <div className="space-y-2">
                    <Label>الموقع *</Label>
                    <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="المدينة، الحي، الشارع" />
                  </div>
                  <div className="space-y-2">
                    <Label>المساحة (م²) *</Label>
                    <Input type="number" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} placeholder="100" />
                  </div>
                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف إضافي للعقار" />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 gradient-primary" disabled={createProperty.isPending || updateProperty.isPending}>
                      {editingProperty ? 'تحديث' : 'إضافة'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>إلغاء</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث في العقارات..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pr-10"
            />
          </div>
        </div>

        {/* بطاقات الملخص الإجمالية */}
        {summaryLoading ? (
          <div className="space-y-4 animate-slide-up">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[5, 6, 7, 8].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
            <Skeleton className="h-14" />
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
                  <div><p className="text-xs text-muted-foreground">إجمالي العقارات</p><p className="text-xl font-bold">{summary.totalProperties}</p></div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/50"><Layers className="w-5 h-5 text-accent-foreground" /></div>
                  <div><p className="text-xs text-muted-foreground">إجمالي الوحدات</p><p className="text-xl font-bold">{summary.totalUnitsCount}</p></div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10"><div className="w-5 h-5 rounded-full bg-success" /></div>
                  <div><p className="text-xs text-muted-foreground">مؤجرة</p><p className="text-xl font-bold text-success">{summary.totalRented}</p></div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10"><div className="w-5 h-5 rounded-full bg-warning" /></div>
                  <div><p className="text-xs text-muted-foreground">شاغرة</p><p className="text-xl font-bold text-warning">{summary.totalVacant}</p></div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
                  <div><p className="text-xs text-muted-foreground">الإيرادات التعاقدية</p><p className="text-lg font-bold">{summary.contractualRevenue.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10"><CircleDollarSign className="w-5 h-5 text-success" /></div>
                  <div><p className="text-xs text-muted-foreground">الدخل النشط</p><p className="text-lg font-bold text-success">{summary.activeIncome.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10"><Receipt className="w-5 h-5 text-destructive" /></div>
                  <div><p className="text-xs text-muted-foreground">المصروفات</p><p className="text-lg font-bold">{summary.totalExpensesAll.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><Wallet className="w-5 h-5 text-foreground" /></div>
                  <div><p className="text-xs text-muted-foreground">صافي الدخل</p><p className={`text-lg font-bold ${summary.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>{summary.netIncome.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">نسبة الإشغال الإجمالية</span>
                  <span className={`text-sm font-bold ${occColor}`}>{summary.overallOccupancy}%</span>
                </div>
                <Progress value={summary.overallOccupancy} className={`h-3 ${occBarColor}`} />
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">جاري التحميل...</p></div>
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
              const rentedUnitIdsForProp = new Set(propContracts.filter(c => (isClosed || c.status === 'active') && c.unit_id).map(c => c.unit_id));
              const isWholePropertyRented = propContracts.some(c => (isClosed || c.status === 'active') && !c.unit_id);
              const totalUnits = propertyUnits.length;
              const rented = isWholePropertyRented ? totalUnits : propertyUnits.filter(u => rentedUnitIdsForProp.has(u.id)).length;
              const vacant = totalUnits - rented;
              const maintenance = propertyUnits.filter(u => u.status === 'صيانة' && !rentedUnitIdsForProp.has(u.id) && !isWholePropertyRented).length;
              // توحيد منطق الإشغال: عقار بدون وحدات مع عقد = 100%، بدون عقد = 0%
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
                if (c.payment_type === 'multi') return sum + (Number(c.payment_amount) || rent / (c.payment_count || 1));
                return sum + rent / 12;
              }, 0);

              const propExpenses = expenses.filter(e => e.property_id === property.id);
              const totalExpenses = propExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
              const netIncome = contractualRevenue - totalExpenses;

              const occupancyColor = occupancy >= 80 ? 'text-success' : occupancy >= 50 ? 'text-warning' : 'text-destructive';
              const progressColor = occupancy >= 80 ? '[&>div]:bg-success' : occupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';

              return (
              <Card
                key={property.id}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProperty(property)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{property.property_number}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => handleEdit(property, e)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: property.id, name: `العقار ${property.property_number}` }); }} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={occupancy} className={`h-2 flex-1 ${progressColor}`} />
                          <span className={`text-xs font-semibold ${occupancyColor}`}>{occupancy}%</span>
                        </div>
                      </>
                    ) : activeContracts.length > 0 ? (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Home className="w-3.5 h-3.5 text-success" />
                          <span className="font-medium text-success">مؤجر بالكامل</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={100} className="h-2 flex-1 [&>div]:bg-success" />
                          <span className="text-xs font-semibold text-success">100%</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">لا توجد وحدات مسجلة</div>
                    )}
                  </div>

                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الإيرادات التعاقدية:</span>
                      <span className="font-semibold">{contractualRevenue.toLocaleString('ar-SA')} ريال</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الدخل النشط:</span>
                      <span className="font-medium text-success">{activeAnnualRent.toLocaleString('ar-SA')} ريال</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الشهري:</span>
                      <span className="font-medium">{monthlyRent.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المصروفات:</span>
                      <span className="font-medium">{totalExpenses.toLocaleString('ar-SA')} ريال</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="text-muted-foreground">الصافي:</span>
                      <span className={`font-bold ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {netIncome.toLocaleString('ar-SA')} ريال
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-2 mt-1 flex items-center gap-2 text-xs text-primary">
                    <DoorOpen className="w-3.5 h-3.5" />
                    <span>اضغط لعرض الوحدات</span>
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
          <PropertyUnitsDialog
            property={selectedProperty}
            contracts={contracts}
            onClose={() => setSelectedProperty(null)}
          />
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
