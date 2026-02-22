import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/useProperties';
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit, useAllUnits, UnitRow, UnitInsert } from '@/hooks/useUnits';
import { useExpenses } from '@/hooks/useExpenses';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useContracts, useCreateContract, useUpdateContract } from '@/hooks/useContracts';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useTenantPayments, useUpsertTenantPayment } from '@/hooks/useTenantPayments';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Property, Contract } from '@/types/database';
import { Plus, Edit, Trash2, Building2, MapPin, Ruler, Search, Home, DoorOpen, X, Minus as MinusIcon } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import ExportMenu from '@/components/ExportMenu';
import { generatePropertiesPDF, generateUnitsPDF, UnitPdfRow } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';
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

const UNIT_TYPES = ['شقة', 'محل', 'مكتب', 'مستودع', 'أخرى'];
const FLOORS = ['بدروم', 'أرضي', 'ميزانين', 'أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سطح'];
const UNIT_STATUSES = ['شاغرة', 'مؤجرة', 'صيانة'];

const statusColor = (status: string) => {
  switch (status) {
    case 'مؤجرة': return 'default';
    case 'شاغرة': return 'secondary';
    case 'صيانة': return 'destructive';
    default: return 'outline';
  }
};

const PropertiesPage = () => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: properties = [], isLoading } = useProperties();
  const { fiscalYearId } = useFiscalYear();

  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);
  const { data: allUnits = [] } = useAllUnits();
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId);
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

  // Units detail dialog
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

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
              const rented = propertyUnits.filter(u => u.status === 'مؤجرة').length;
              const vacant = propertyUnits.filter(u => u.status === 'شاغرة').length;
              const maintenance = propertyUnits.filter(u => u.status === 'صيانة').length;
              const totalUnits = propertyUnits.length;
              const occupancy = totalUnits > 0 ? Math.round((rented / totalUnits) * 100) : 0;

              // جميع العقود المرتبطة بالعقار (نشطة + منتهية) - الإيرادات التعاقدية
              const allPropertyContracts = contracts.filter(c => c.property_id === property.id);
              const contractualRevenue = allPropertyContracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);
              
              // العقود النشطة فقط - الدخل النشط الحالي
              const activeContracts = allPropertyContracts.filter(c => c.status === 'active');
              const activeAnnualRent = activeContracts.reduce((sum, c) => sum + Number(c.rent_amount), 0);
              
              // الشهري الفعلي محسوب حسب نوع الدفع لكل عقد
              const monthlyRent = allPropertyContracts.reduce((sum, c) => {
                const rent = Number(c.rent_amount);
                if (c.payment_type === 'monthly') return sum + (Number(c.payment_amount) || rent / 12);
                if (c.payment_type === 'multi') return sum + (Number(c.payment_amount) || rent / (c.payment_count || 1));
                return sum + rent / 12; // annual
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

                  {/* المؤشرات التشغيلية */}
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

                  {/* المؤشرات المالية */}
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

        {/* Property Units Dialog */}
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

// ─── Payment types ───────────────────────────────────────────────────
const PAYMENT_TYPES = [
  { value: 'annual', label: 'سنوي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'multi', label: 'دفعات متعددة' },
];

// ─── Property Units Dialog Component ─────────────────────────────────
interface PropertyUnitsDialogProps {
  property: Property;
  contracts: Contract[];
  onClose: () => void;
}

const PropertyUnitsDialog = ({ property, contracts, onClose }: PropertyUnitsDialogProps) => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: units = [], isLoading } = useUnits(property.id);
  const { data: tenantPayments = [] } = useTenantPayments();
  const upsertPayment = useUpsertTenantPayment();
  const { fiscalYearId } = useFiscalYear();
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const createContract = useCreateContract();
  const updateContractMutation = useUpdateContract();

  const [rentalMode, setRentalMode] = useState<'units' | 'whole'>('units');
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<UnitRow | null>(null);

  // Whole property rental form
  const [wholeRentalForm, setWholeRentalForm] = useState({
    tenant_name: '',
    rent_amount: '',
    payment_type: 'annual',
    payment_count: '1',
    start_date: '',
    end_date: '',
  });
  const [isWholeFormOpen, setIsWholeFormOpen] = useState(false);

  const [unitForm, setUnitForm] = useState<UnitInsert & {
    tenant_name?: string;
    rent_amount?: string;
    payment_type?: string;
    payment_count?: string;
    contract_start_date?: string;
    contract_end_date?: string;
  }>({
    property_id: property.id,
    unit_number: '',
    unit_type: 'شقة',
    floor: '',
    area: undefined,
    status: 'شاغرة',
    notes: '',
    tenant_name: '',
    rent_amount: '',
    payment_type: 'annual',
    payment_count: '1',
    contract_start_date: '',
    contract_end_date: '',
  });

  const resetUnitForm = () => {
    setUnitForm({
      property_id: property.id, unit_number: '', unit_type: 'شقة', floor: '', area: undefined, status: 'شاغرة', notes: '',
      tenant_name: '', rent_amount: '', payment_type: 'annual', payment_count: '1', contract_start_date: '', contract_end_date: '',
    });
    setEditingUnit(null);
    setIsUnitFormOpen(false);
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.unit_number) {
      toast.error('يرجى إدخال رقم الوحدة');
      return;
    }

    let savedUnitId: string | undefined;

    if (editingUnit) {
      await updateUnit.mutateAsync({
        id: editingUnit.id,
        unit_number: unitForm.unit_number,
        unit_type: unitForm.unit_type,
        floor: unitForm.floor || null,
        area: unitForm.area ?? null,
        status: unitForm.status,
        notes: unitForm.notes || null,
      });
      savedUnitId = editingUnit.id;
    } else {
      const result = await createUnit.mutateAsync({
        property_id: unitForm.property_id,
        unit_number: unitForm.unit_number,
        unit_type: unitForm.unit_type,
        floor: unitForm.floor || '',
        area: unitForm.area,
        status: unitForm.status,
        notes: unitForm.notes || '',
      });
      savedUnitId = result?.id;
    }

    // Auto-create/update contract if status is rented
    if (unitForm.status === 'مؤجرة' && unitForm.tenant_name && unitForm.rent_amount && savedUnitId) {
      const rentAmount = parseFloat(unitForm.rent_amount);
      const paymentCount = unitForm.payment_type === 'monthly' ? 12 : unitForm.payment_type === 'multi' ? parseInt(unitForm.payment_count || '1') : 1;
      const paymentAmount = rentAmount / paymentCount;

      const existingContract = contracts.find(c => c.unit_id === savedUnitId && c.status === 'active');

      if (existingContract) {
        await updateContractMutation.mutateAsync({
          id: existingContract.id,
          tenant_name: unitForm.tenant_name,
          rent_amount: rentAmount,
          payment_type: unitForm.payment_type || 'annual',
          payment_count: paymentCount,
          payment_amount: paymentAmount,
          start_date: unitForm.contract_start_date || existingContract.start_date,
          end_date: unitForm.contract_end_date || existingContract.end_date,
        });
      } else {
        if (!unitForm.contract_start_date || !unitForm.contract_end_date) {
          toast.error('يرجى تحديد تاريخ بداية ونهاية العقد');
          return;
        }
        await createContract.mutateAsync({
          contract_number: `C-${property.property_number}-${unitForm.unit_number}-${Date.now().toString(36)}`,
          property_id: property.id,
          unit_id: savedUnitId,
          tenant_name: unitForm.tenant_name,
          rent_amount: rentAmount,
          start_date: unitForm.contract_start_date,
          end_date: unitForm.contract_end_date,
          status: 'active',
          payment_type: unitForm.payment_type || 'annual',
          payment_count: paymentCount,
          payment_amount: paymentAmount,
        });
      }
    }

    resetUnitForm();
  };

  const handleEditUnit = (unit: UnitRow) => {
    const existingContract = contracts.find(c => c.unit_id === unit.id && c.status === 'active');
    setEditingUnit(unit);
    setUnitForm({
      property_id: property.id,
      unit_number: unit.unit_number,
      unit_type: unit.unit_type,
      floor: unit.floor || '',
      area: unit.area ?? undefined,
      status: unit.status,
      notes: unit.notes || '',
      tenant_name: existingContract?.tenant_name || '',
      rent_amount: existingContract?.rent_amount?.toString() || '',
      payment_type: existingContract?.payment_type || 'annual',
      payment_count: existingContract?.payment_count?.toString() || '1',
      contract_start_date: existingContract?.start_date || '',
      contract_end_date: existingContract?.end_date || '',
    });
    setIsUnitFormOpen(true);
  };

  const handleConfirmDeleteUnit = async () => {
    if (!deleteUnitTarget) return;
    await deleteUnit.mutateAsync({ id: deleteUnitTarget.id, propertyId: property.id });
    setDeleteUnitTarget(null);
  };

  // Get tenant for a unit - مع بيانات الدفع الكاملة
  const getTenant = (unitId: string): { name: string; status: string; start_date: string | null; end_date: string | null; rent_amount: number; contract_id: string; payment_type: string; payment_amount: number | null; payment_count: number } | null => {
    const activeContract = contracts.find(c => c.unit_id === unitId && c.status === 'active');
    if (activeContract) return { name: activeContract.tenant_name, status: 'active', start_date: activeContract.start_date, end_date: activeContract.end_date, rent_amount: activeContract.rent_amount, contract_id: activeContract.id, payment_type: activeContract.payment_type || 'annual', payment_amount: activeContract.payment_amount ?? null, payment_count: activeContract.payment_count || 1 };
    // ترتيب العقود المنتهية زمنياً لعرض الأحدث
    const sortedContracts = contracts.filter(c => c.unit_id === unitId).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
    const anyContract = sortedContracts[0];
    if (anyContract) return { name: anyContract.tenant_name, status: anyContract.status, start_date: anyContract.start_date, end_date: anyContract.end_date, rent_amount: anyContract.rent_amount, contract_id: anyContract.id, payment_type: anyContract.payment_type || 'annual', payment_amount: anyContract.payment_amount ?? null, payment_count: anyContract.payment_count || 1 };
    return null;
  };

  const getPaymentInfo = (contractId: string) => {
    const payment = tenantPayments.find(p => p.contract_id === contractId);
    return payment ? payment.paid_months : 0;
  };

  // حساب حالة التحصيل
  const getPaymentStatus = (tenant: NonNullable<ReturnType<typeof getTenant>>, paidMonths: number): { status: 'ontime' | 'late'; overdueCount: number } => {
    if (tenant.status !== 'active' || !tenant.start_date) return { status: 'ontime', overdueCount: 0 };
    const start = new Date(tenant.start_date);
    const today = new Date();
    const totalMonths = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    if (totalMonths < 0) return { status: 'ontime', overdueCount: 0 };
    let expectedPayments: number;
    const pt = tenant.payment_type;
    if (pt === 'monthly') expectedPayments = totalMonths;
    else if (pt === 'multi') expectedPayments = Math.floor(totalMonths / (12 / (tenant.payment_count || 1)));
    else expectedPayments = Math.floor(totalMonths / 12); // annual
    const overdue = expectedPayments - paidMonths;
    if (overdue > 0) return { status: 'late', overdueCount: overdue };
    return { status: 'ontime', overdueCount: 0 };
  };

  // Whole property contracts (no unit_id) - النشط أولاً ثم الأحدث
  const wholePropertyContracts = contracts.filter(c => c.property_id === property.id && !c.unit_id).sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
  });
  const wholePropertyContract = wholePropertyContracts[0] || null;

  const handleWholePropertySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wholeRentalForm.tenant_name || !wholeRentalForm.rent_amount || !wholeRentalForm.start_date || !wholeRentalForm.end_date) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const rentAmount = parseFloat(wholeRentalForm.rent_amount);
    const paymentCount = wholeRentalForm.payment_type === 'monthly' ? 12 : wholeRentalForm.payment_type === 'multi' ? parseInt(wholeRentalForm.payment_count || '1') : 1;
    const paymentAmount = rentAmount / paymentCount;

    if (wholePropertyContract) {
      await updateContractMutation.mutateAsync({
        id: wholePropertyContract.id,
        tenant_name: wholeRentalForm.tenant_name,
        rent_amount: rentAmount,
        payment_type: wholeRentalForm.payment_type,
        payment_count: paymentCount,
        payment_amount: paymentAmount,
        start_date: wholeRentalForm.start_date,
        end_date: wholeRentalForm.end_date,
      });
    } else {
      await createContract.mutateAsync({
        contract_number: `C-${property.property_number}-WHOLE-${Date.now().toString(36)}`,
        property_id: property.id,
        tenant_name: wholeRentalForm.tenant_name,
        rent_amount: rentAmount,
        start_date: wholeRentalForm.start_date,
        end_date: wholeRentalForm.end_date,
        status: 'active',
        payment_type: wholeRentalForm.payment_type,
        payment_count: paymentCount,
        payment_amount: paymentAmount,
      });
    }
    setIsWholeFormOpen(false);
  };

  // Count stats
  const rented = units.filter(u => u.status === 'مؤجرة').length;
  const vacant = units.filter(u => u.status === 'شاغرة').length;
  const maintenance = units.filter(u => u.status === 'صيانة').length;

  const computedPaymentAmount = unitForm.rent_amount
    ? parseFloat(unitForm.rent_amount) / (unitForm.payment_type === 'monthly' ? 12 : unitForm.payment_type === 'multi' ? parseInt(unitForm.payment_count || '1') : 1)
    : 0;

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5" />
              عقار {property.property_number} - {property.location}
            </DialogTitle>
            <DialogDescription className="sr-only">إدارة وحدات العقار</DialogDescription>
          </DialogHeader>

          {/* Property info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">النوع</p>
              <p className="font-medium text-sm">{property.property_type}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">الموقع</p>
              <p className="font-medium text-sm">{property.location}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">المساحة</p>
              <p className="font-medium text-sm">{property.area} م²</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">إجمالي الوحدات</p>
              <p className="font-medium text-sm">{units.length}</p>
            </div>
          </div>

          {/* Rental mode tabs */}
          <Tabs value={rentalMode} onValueChange={(v) => setRentalMode(v as 'units' | 'whole')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="units">وحدات منفصلة</TabsTrigger>
              <TabsTrigger value="whole">العقار كامل</TabsTrigger>
            </TabsList>

            {/* ─── Units Tab ─── */}
            <TabsContent value="units" className="space-y-4 mt-4">
              {/* Stats badges */}
              {units.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default" className="gap-1"><Home className="w-3 h-3" /> مؤجرة: {rented}</Badge>
                  <Badge variant="secondary" className="gap-1"><DoorOpen className="w-3 h-3" /> شاغرة: {vacant}</Badge>
                  {maintenance > 0 && <Badge variant="destructive" className="gap-1">صيانة: {maintenance}</Badge>}
                </div>
              )}

              {/* Add unit button + export/print */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-semibold">الوحدات السكنية</h3>
                <div className="flex gap-2 flex-wrap print:hidden">
                  <ExportMenu onExportPdf={() => {
                    const pdfRows: UnitPdfRow[] = units.map(u => {
                      const tenant = getTenant(u.id);
                      return {
                        unit_number: u.unit_number, unit_type: u.unit_type, status: u.status,
                        tenant_name: tenant?.name || null, start_date: tenant?.start_date || null, end_date: tenant?.end_date || null,
                        rent_amount: tenant?.rent_amount || null, paid_months: tenant ? getPaymentInfo(tenant.contract_id) : 0,
                      };
                    });
                    generateUnitsPDF(property.property_number, property.location, pdfRows, pdfWaqfInfo);
                  }} />
                  <Button size="sm" className="gap-1" onClick={() => { resetUnitForm(); setIsUnitFormOpen(true); }}>
                    <Plus className="w-4 h-4" /> إضافة وحدة
                  </Button>
                </div>
              </div>

              {/* Unit form */}
              {isUnitFormOpen && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <form onSubmit={handleUnitSubmit} className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">رقم الوحدة *</Label>
                          <Input value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })} placeholder="شقة 1" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">النوع</Label>
                          <Select value={unitForm.unit_type} onValueChange={(v) => setUnitForm({ ...unitForm, unit_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{UNIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الدور</Label>
                          <Select value={unitForm.floor || ''} onValueChange={(v) => setUnitForm({ ...unitForm, floor: v })}>
                            <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
                            <SelectContent>{FLOORS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">المساحة (م²)</Label>
                          <Input type="number" value={unitForm.area ?? ''} onChange={(e) => setUnitForm({ ...unitForm, area: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="80" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الحالة</Label>
                          <Select value={unitForm.status} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{UNIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">ملاحظات</Label>
                          <Input value={unitForm.notes || ''} onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })} placeholder="ملاحظات" />
                        </div>
                      </div>

                      {/* Rental fields - shown when status is مؤجرة */}
                      {unitForm.status === 'مؤجرة' && (
                        <div className="border-t pt-3 mt-3 space-y-3">
                          <h4 className="font-semibold text-sm text-primary">بيانات الإيجار</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">اسم المستأجر *</Label>
                              <Input value={unitForm.tenant_name || ''} onChange={(e) => setUnitForm({ ...unitForm, tenant_name: e.target.value })} placeholder="اسم المستأجر" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">قيمة الإيجار السنوي *</Label>
                              <Input type="number" value={unitForm.rent_amount || ''} onChange={(e) => setUnitForm({ ...unitForm, rent_amount: e.target.value })} placeholder="50000" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">نوع الدفع</Label>
                              <Select value={unitForm.payment_type || 'annual'} onValueChange={(v) => setUnitForm({ ...unitForm, payment_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            {unitForm.payment_type === 'multi' && (
                              <div className="space-y-1">
                                <Label className="text-xs">عدد الدفعات</Label>
                                <Input type="number" value={unitForm.payment_count || '1'} onChange={(e) => setUnitForm({ ...unitForm, payment_count: e.target.value })} placeholder="4" min="1" />
                              </div>
                            )}
                            <div className="space-y-1">
                              <Label className="text-xs">تاريخ بداية العقد *</Label>
                              <Input type="date" value={unitForm.contract_start_date || ''} onChange={(e) => setUnitForm({ ...unitForm, contract_start_date: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">تاريخ نهاية العقد *</Label>
                              <Input type="date" value={unitForm.contract_end_date || ''} onChange={(e) => setUnitForm({ ...unitForm, contract_end_date: e.target.value })} />
                            </div>
                          </div>
                          {unitForm.rent_amount && (
                            <div className="bg-muted/50 rounded-lg p-3 text-sm">
                              <span className="text-muted-foreground">قيمة الدفعة الواحدة: </span>
                              <span className="font-semibold">{computedPaymentAmount.toLocaleString('ar-SA')} ريال</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button type="submit" size="sm" disabled={createUnit.isPending || updateUnit.isPending || createContract.isPending || updateContractMutation.isPending}>
                          {editingUnit ? 'تحديث' : 'إضافة'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={resetUnitForm}>إلغاء</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Units table */}
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
              ) : units.length === 0 ? (
                <div className="text-center py-8">
                  <DoorOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">لا توجد وحدات مسجلة لهذا العقار</p>
                  <p className="text-xs text-muted-foreground mt-1">اضغط "إضافة وحدة" لبدء تسجيل الوحدات السكنية</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-right">رقم الوحدة</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right min-w-[120px]">المستأجر</TableHead>
                        <TableHead className="text-right">بداية العقد</TableHead>
                        <TableHead className="text-right">نهاية العقد</TableHead>
                        <TableHead className="text-right">الإيجار الشهري</TableHead>
                        <TableHead className="text-right">الإيجار السنوي</TableHead>
                        <TableHead className="text-right min-w-[180px]">الدفعات المسددة</TableHead>
                        <TableHead className="text-right">حالة التحصيل</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit, idx) => {
                        const tenant = getTenant(unit.id);
                        const paid = tenant ? getPaymentInfo(tenant.contract_id) : 0;
                        const isComplete = paid >= 12;
                        const progressPercent = (paid / 12) * 100;
                        return (
                          <TableRow key={unit.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                            <TableCell className="font-medium">{unit.unit_number}</TableCell>
                            <TableCell>{unit.unit_type}</TableCell>
                            <TableCell><Badge variant={statusColor(unit.status)}>{unit.status}</Badge></TableCell>
                            <TableCell>
                              {!tenant ? <span className="text-muted-foreground">-</span> : (
                                <span className="whitespace-nowrap">
                                  {tenant.name}
                                  {tenant.status !== 'active' && (
                                    <Badge variant="outline" className="mr-2 text-[10px] px-1.5 py-0 text-destructive border-destructive/30">منتهي</Badge>
                                  )}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{tenant?.start_date || <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell>{tenant?.end_date || <span className="text-muted-foreground">-</span>}</TableCell>
                            <TableCell>
                              {!tenant ? <span className="text-muted-foreground">-</span> : (
                                <span className="font-medium">
                                  {(() => {
                                    const rent = Number(tenant.rent_amount);
                                    if (tenant.payment_type === 'monthly') return (Number(tenant.payment_amount) || rent / 12);
                                    if (tenant.payment_type === 'multi') return (Number(tenant.payment_amount) || rent / (tenant.payment_count || 1));
                                    return rent / 12;
                                  })().toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {!tenant ? <span className="text-muted-foreground">-</span> : (
                                <span className="font-medium">{tenant.rent_amount.toLocaleString('ar-SA')} ريال</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {!tenant ? <span className="text-muted-foreground">-</span> : (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={paid <= 0 || upsertPayment.isPending}
                                      onClick={() => upsertPayment.mutate({ contract_id: tenant.contract_id, paid_months: paid - 1 })}>
                                      <MinusIcon className="w-3 h-3" />
                                    </Button>
                                    <span className={`min-w-[3rem] text-center font-semibold ${isComplete ? 'text-success' : 'text-destructive'}`}>{paid}/12</span>
                                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={paid >= 12 || upsertPayment.isPending}
                                      onClick={() => {
                                        const rent = Number(tenant.rent_amount);
                                        const monthlyAmount = tenant.payment_type === 'monthly' ? (Number(tenant.payment_amount) || rent / 12)
                                          : tenant.payment_type === 'multi' ? (Number(tenant.payment_amount) || rent / (tenant.payment_count || 1))
                                          : rent / 12;
                                        upsertPayment.mutate({
                                          contract_id: tenant.contract_id,
                                          paid_months: paid + 1,
                                          auto_income: {
                                            payment_amount: monthlyAmount,
                                            property_id: property.id,
                                            fiscal_year_id: fiscalYearId === 'all' ? null : fiscalYearId,
                                            tenant_name: tenant.name,
                                          },
                                        });
                                      }}>
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <Progress value={progressPercent} className={`h-2 ${isComplete ? '[&>div]:bg-success' : paid >= 6 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`} />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {!tenant || tenant.status !== 'active' ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (() => {
                                const ps = getPaymentStatus(tenant, paid);
                                return ps.status === 'ontime'
                                  ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">منتظم</Badge>
                                  : <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">متأخر ({ps.overdueCount} دفعة)</Badge>;
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUnit(unit)}><Edit className="w-3 h-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteUnitTarget(unit)}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* صف الإجمالي الشامل - يشمل عقود الوحدات + عقود العقار كامل */}
                      {(() => {
                        const getMonthlyForTenant = (t: NonNullable<ReturnType<typeof getTenant>>) => {
                          const rent = Number(t.rent_amount);
                          if (t.payment_type === 'monthly') return Number(t.payment_amount) || rent / 12;
                          if (t.payment_type === 'multi') return Number(t.payment_amount) || rent / (t.payment_count || 1);
                          return rent / 12;
                        };
                        let totalAnnual = 0;
                        let totalMonthly = 0;
                        units.forEach(u => {
                          const t = getTenant(u.id);
                          if (t) {
                            totalAnnual += Number(t.rent_amount);
                            totalMonthly += getMonthlyForTenant(t);
                          }
                        });
                        // إضافة عقود "العقار كامل" (بدون unit_id)
                        wholePropertyContracts.forEach(wc => {
                          totalAnnual += Number(wc.rent_amount);
                          const rent = Number(wc.rent_amount);
                          if (wc.payment_type === 'monthly') totalMonthly += Number(wc.payment_amount) || rent / 12;
                          else if (wc.payment_type === 'multi') totalMonthly += Number(wc.payment_amount) || rent / (wc.payment_count || 1);
                          else totalMonthly += rent / 12;
                        });
                        return (
                          <TableRow className="bg-primary/10 font-bold border-t-2">
                            <TableCell colSpan={3} className="text-right">
                              الإجمالي <Badge variant="outline" className="mr-2 text-[10px]">شامل النشط والمنتهي</Badge>
                            </TableCell>
                            <TableCell colSpan={3}></TableCell>
                            <TableCell>{totalMonthly.toLocaleString('ar-SA', { maximumFractionDigits: 0 })} ريال</TableCell>
                            <TableCell>{totalAnnual.toLocaleString('ar-SA')} ريال</TableCell>
                            <TableCell colSpan={3}></TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ─── Whole Property Tab ─── */}
            <TabsContent value="whole" className="space-y-4 mt-4">
              {wholePropertyContract ? (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-semibold text-lg">بيانات عقد العقار كامل</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">المستأجر</p>
                        <p className="font-medium">{wholePropertyContract.tenant_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">الإيجار السنوي</p>
                        <p className="font-medium">{wholePropertyContract.rent_amount.toLocaleString('ar-SA')} ريال</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">نوع الدفع</p>
                        <p className="font-medium">{PAYMENT_TYPES.find(t => t.value === wholePropertyContract.payment_type)?.label || wholePropertyContract.payment_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">عدد الدفعات</p>
                        <p className="font-medium">{wholePropertyContract.payment_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">قيمة الدفعة</p>
                        <p className="font-medium">{(wholePropertyContract.payment_amount || 0).toLocaleString('ar-SA')} ريال</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">الحالة</p>
                        <Badge variant={wholePropertyContract.status === 'active' ? 'default' : 'secondary'}>{wholePropertyContract.status === 'active' ? 'ساري' : 'منتهي'}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">بداية العقد</p>
                        <p className="font-medium">{wholePropertyContract.start_date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">نهاية العقد</p>
                        <p className="font-medium">{wholePropertyContract.end_date}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setWholeRentalForm({
                        tenant_name: wholePropertyContract.tenant_name,
                        rent_amount: wholePropertyContract.rent_amount.toString(),
                        payment_type: wholePropertyContract.payment_type || 'annual',
                        payment_count: wholePropertyContract.payment_count?.toString() || '1',
                        start_date: wholePropertyContract.start_date,
                        end_date: wholePropertyContract.end_date,
                      });
                      setIsWholeFormOpen(true);
                    }}>
                      <Edit className="w-4 h-4 ml-2" /> تعديل العقد
                    </Button>
                  </CardContent>
                </Card>
              ) : !isWholeFormOpen ? (
                <div className="text-center py-8 space-y-3">
                  <Building2 className="w-10 h-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">لا يوجد عقد لتأجير العقار كامل</p>
                  <Button onClick={() => {
                    setWholeRentalForm({ tenant_name: '', rent_amount: '', payment_type: 'annual', payment_count: '1', start_date: '', end_date: '' });
                    setIsWholeFormOpen(true);
                  }}>
                    <Plus className="w-4 h-4 ml-2" /> إضافة عقد للعقار
                  </Button>
                </div>
              ) : null}

              {/* Whole property rental form */}
              {isWholeFormOpen && (
                <Card className="border-primary/20">
                  <CardContent className="pt-4">
                    <form onSubmit={handleWholePropertySave} className="space-y-3">
                      <h4 className="font-semibold text-sm text-primary">بيانات عقد العقار كامل</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">اسم المستأجر *</Label>
                          <Input value={wholeRentalForm.tenant_name} onChange={(e) => setWholeRentalForm({ ...wholeRentalForm, tenant_name: e.target.value })} placeholder="اسم المستأجر" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">قيمة الإيجار السنوي *</Label>
                          <Input type="number" value={wholeRentalForm.rent_amount} onChange={(e) => setWholeRentalForm({ ...wholeRentalForm, rent_amount: e.target.value })} placeholder="50000" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">نوع الدفع</Label>
                          <Select value={wholeRentalForm.payment_type} onValueChange={(v) => setWholeRentalForm({ ...wholeRentalForm, payment_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {wholeRentalForm.payment_type === 'multi' && (
                          <div className="space-y-1">
                            <Label className="text-xs">عدد الدفعات</Label>
                            <Input type="number" value={wholeRentalForm.payment_count} onChange={(e) => setWholeRentalForm({ ...wholeRentalForm, payment_count: e.target.value })} placeholder="4" min="1" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">تاريخ بداية العقد *</Label>
                          <Input type="date" value={wholeRentalForm.start_date} onChange={(e) => setWholeRentalForm({ ...wholeRentalForm, start_date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">تاريخ نهاية العقد *</Label>
                          <Input type="date" value={wholeRentalForm.end_date} onChange={(e) => setWholeRentalForm({ ...wholeRentalForm, end_date: e.target.value })} />
                        </div>
                      </div>
                      {wholeRentalForm.rent_amount && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          <span className="text-muted-foreground">قيمة الدفعة الواحدة: </span>
                          <span className="font-semibold">
                            {(parseFloat(wholeRentalForm.rent_amount) / (wholeRentalForm.payment_type === 'monthly' ? 12 : wholeRentalForm.payment_type === 'multi' ? parseInt(wholeRentalForm.payment_count || '1') : 1)).toLocaleString('ar-SA')} ريال
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button type="submit" size="sm" disabled={createContract.isPending || updateContractMutation.isPending}>
                          {wholePropertyContract ? 'تحديث العقد' : 'إنشاء العقد'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsWholeFormOpen(false)}>إلغاء</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete unit confirmation */}
      <AlertDialog open={!!deleteUnitTarget} onOpenChange={(open) => !open && setDeleteUnitTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الوحدة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الوحدة "{deleteUnitTarget?.unit_number}"؟ العقود المرتبطة بها ستبقى ولكن بدون ربط بوحدة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteUnit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PropertiesPage;
