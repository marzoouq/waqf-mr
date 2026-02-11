import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/useProperties';
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit, UnitRow, UnitInsert } from '@/hooks/useUnits';
import { useContracts } from '@/hooks/useContracts';
import { Property } from '@/types/database';
import { Plus, Edit, Trash2, Building2, MapPin, Ruler, Printer, FileDown, Search, Home, DoorOpen, X } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import { generatePropertiesPDF } from '@/utils/pdfGenerator';
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
  const { data: contracts = [] } = useContracts();
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">إدارة العقارات</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة جميع عقارات الوقف</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
            <Button variant="outline" size="sm" onClick={() => generatePropertiesPDF(properties, pdfWaqfInfo)} className="gap-2">
              <FileDown className="w-4 h-4" />
              تصدير PDF
            </Button>
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث في العقارات..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pr-10"
          />
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
            {filteredProperties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((property) => (
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" /><span>{property.property_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" /><span>{property.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ruler className="w-4 h-4" /><span>{property.area} م²</span>
                  </div>
                  {property.description && (
                    <p className="text-sm text-muted-foreground border-t pt-2 mt-2">{property.description}</p>
                  )}
                  <div className="border-t pt-2 mt-2 flex items-center gap-2 text-sm text-primary">
                    <DoorOpen className="w-4 h-4" />
                    <span>اضغط لعرض الوحدات السكنية</span>
                  </div>
                </CardContent>
              </Card>
            ))}
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

// ─── Property Units Dialog Component ─────────────────────────────────
interface PropertyUnitsDialogProps {
  property: Property;
  contracts: Array<{ id: string; tenant_name: string; status: string; unit_id?: string; property_id: string }>;
  onClose: () => void;
}

const PropertyUnitsDialog = ({ property, contracts, onClose }: PropertyUnitsDialogProps) => {
  const { data: units = [], isLoading } = useUnits(property.id);
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<UnitRow | null>(null);
  const [unitForm, setUnitForm] = useState<UnitInsert>({
    property_id: property.id,
    unit_number: '',
    unit_type: 'شقة',
    floor: '',
    area: undefined,
    status: 'شاغرة',
    notes: '',
  });

  const resetUnitForm = () => {
    setUnitForm({ property_id: property.id, unit_number: '', unit_type: 'شقة', floor: '', area: undefined, status: 'شاغرة', notes: '' });
    setEditingUnit(null);
    setIsUnitFormOpen(false);
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.unit_number) {
      toast.error('يرجى إدخال رقم الوحدة');
      return;
    }
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
    } else {
      await createUnit.mutateAsync(unitForm);
    }
    resetUnitForm();
  };

  const handleEditUnit = (unit: UnitRow) => {
    setEditingUnit(unit);
    setUnitForm({
      property_id: property.id,
      unit_number: unit.unit_number,
      unit_type: unit.unit_type,
      floor: unit.floor || '',
      area: unit.area ?? undefined,
      status: unit.status,
      notes: unit.notes || '',
    });
    setIsUnitFormOpen(true);
  };

  const handleConfirmDeleteUnit = async () => {
    if (!deleteUnitTarget) return;
    await deleteUnit.mutateAsync({ id: deleteUnitTarget.id, propertyId: property.id });
    setDeleteUnitTarget(null);
  };

  // Get tenant for a unit - prioritize active contracts, fallback to expired
  const getTenant = (unitId: string): { name: string; status: string } | null => {
    const activeContract = contracts.find(c => c.unit_id === unitId && c.status === 'active');
    if (activeContract) return { name: activeContract.tenant_name, status: 'active' };
    const anyContract = contracts.find(c => c.unit_id === unitId);
    if (anyContract) return { name: anyContract.tenant_name, status: anyContract.status };
    return null;
  };

  // Count stats
  const rented = units.filter(u => u.status === 'مؤجرة').length;
  const vacant = units.filter(u => u.status === 'شاغرة').length;
  const maintenance = units.filter(u => u.status === 'صيانة').length;

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5" />
              عقار {property.property_number} - {property.location}
            </DialogTitle>
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

          {/* Stats badges */}
          {units.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default" className="gap-1">
                <Home className="w-3 h-3" /> مؤجرة: {rented}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <DoorOpen className="w-3 h-3" /> شاغرة: {vacant}
              </Badge>
              {maintenance > 0 && (
                <Badge variant="destructive" className="gap-1">
                  صيانة: {maintenance}
                </Badge>
              )}
            </div>
          )}

          {/* Add unit button */}
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">الوحدات السكنية</h3>
            <Button size="sm" className="gap-1" onClick={() => { resetUnitForm(); setIsUnitFormOpen(true); }}>
              <Plus className="w-4 h-4" /> إضافة وحدة
            </Button>
          </div>

          {/* Unit form */}
          {isUnitFormOpen && (
            <Card className="border-primary/20">
              <CardContent className="pt-4">
                <form onSubmit={handleUnitSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">رقم الوحدة *</Label>
                      <Input
                        value={unitForm.unit_number}
                        onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })}
                        placeholder="شقة 1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">النوع</Label>
                      <Select value={unitForm.unit_type} onValueChange={(v) => setUnitForm({ ...unitForm, unit_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الدور</Label>
                      <Select value={unitForm.floor || ''} onValueChange={(v) => setUnitForm({ ...unitForm, floor: v })}>
                        <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
                        <SelectContent>
                          {FLOORS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">المساحة (م²)</Label>
                      <Input
                        type="number"
                        value={unitForm.area ?? ''}
                        onChange={(e) => setUnitForm({ ...unitForm, area: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="80"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">الحالة</Label>
                      <Select value={unitForm.status} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">ملاحظات</Label>
                      <Input
                        value={unitForm.notes || ''}
                        onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })}
                        placeholder="ملاحظات"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" size="sm" disabled={createUnit.isPending || updateUnit.isPending}>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الوحدة</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">المساحة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.unit_number}</TableCell>
                      <TableCell>{unit.unit_type}</TableCell>
                      <TableCell>{unit.floor || '-'}</TableCell>
                      <TableCell>{unit.area ? `${unit.area} م²` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(unit.status)}>{unit.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const tenant = getTenant(unit.id);
                          if (!tenant) return <span className="text-muted-foreground">-</span>;
                          return (
                            <span>
                              {tenant.name}
                              {tenant.status !== 'active' && (
                                <Badge variant="outline" className="mr-2 text-[10px] px-1.5 py-0 text-destructive border-destructive/30">منتهي</Badge>
                              )}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUnit(unit)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteUnitTarget(unit)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
