import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit, UnitRow, UnitInsert } from '@/hooks/useUnits';
import { useCreateContract, useUpdateContract } from '@/hooks/useContracts';
import { useTenantPayments, useUpsertTenantPayment } from '@/hooks/useTenantPayments';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Property, Contract } from '@/types/database';
import { Plus, Edit, Trash2, Building2, Home, DoorOpen, Minus as MinusIcon } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import { generateUnitsPDF, UnitPdfRow } from '@/utils/pdf';
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

const PAYMENT_TYPES = [
  { value: 'annual', label: 'سنوي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'multi', label: 'دفعات متعددة' },
];

const statusColor = (status: string) => {
  switch (status) {
    case 'مؤجرة': return 'default';
    case 'شاغرة': return 'secondary';
    case 'صيانة': return 'destructive';
    default: return 'outline';
  }
};

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

  const getTenant = (unitId: string): { name: string; status: string; start_date: string | null; end_date: string | null; rent_amount: number; contract_id: string; payment_type: string; payment_amount: number | null; payment_count: number } | null => {
    const activeContract = contracts.find(c => c.unit_id === unitId && c.status === 'active');
    if (activeContract) return { name: activeContract.tenant_name, status: 'active', start_date: activeContract.start_date, end_date: activeContract.end_date, rent_amount: activeContract.rent_amount, contract_id: activeContract.id, payment_type: activeContract.payment_type || 'annual', payment_amount: activeContract.payment_amount ?? null, payment_count: activeContract.payment_count || 1 };
    const sortedContracts = contracts.filter(c => c.unit_id === unitId).sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
    const anyContract = sortedContracts[0];
    if (anyContract) return { name: anyContract.tenant_name, status: anyContract.status, start_date: anyContract.start_date, end_date: anyContract.end_date, rent_amount: anyContract.rent_amount, contract_id: anyContract.id, payment_type: anyContract.payment_type || 'annual', payment_amount: anyContract.payment_amount ?? null, payment_count: anyContract.payment_count || 1 };
    return null;
  };

  const getPaymentInfo = (contractId: string) => {
    const payment = tenantPayments.find(p => p.contract_id === contractId);
    return payment ? payment.paid_months : 0;
  };

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
    else expectedPayments = Math.floor(totalMonths / 12);
    const overdue = expectedPayments - paidMonths;
    if (overdue > 0) return { status: 'late', overdueCount: overdue };
    return { status: 'ontime', overdueCount: 0 };
  };

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

          <Tabs value={rentalMode} onValueChange={(v) => setRentalMode(v as 'units' | 'whole')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="units">وحدات منفصلة</TabsTrigger>
              <TabsTrigger value="whole">العقار كامل</TabsTrigger>
            </TabsList>

            <TabsContent value="units" className="space-y-4 mt-4">
              {units.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default" className="gap-1"><Home className="w-3 h-3" /> مؤجرة: {rented}</Badge>
                  <Badge variant="secondary" className="gap-1"><DoorOpen className="w-3 h-3" /> شاغرة: {vacant}</Badge>
                  {maintenance > 0 && <Badge variant="destructive" className="gap-1">صيانة: {maintenance}</Badge>}
                </div>
              )}

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
                        payment_type: tenant?.payment_type, payment_count: tenant?.payment_count,
                      };
                    });
                    generateUnitsPDF(property.property_number, property.location, pdfRows, pdfWaqfInfo);
                  }} />
                  <Button size="sm" className="gap-1" onClick={() => { resetUnitForm(); setIsUnitFormOpen(true); }}>
                    <Plus className="w-4 h-4" /> إضافة وحدة
                  </Button>
                </div>
              </div>

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
                          <NativeSelect value={unitForm.unit_type ?? ''} onValueChange={(v) => setUnitForm({ ...unitForm, unit_type: v })} options={UNIT_TYPES.map(t => ({ value: t, label: t }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الدور</Label>
                          <NativeSelect value={unitForm.floor || ''} onValueChange={(v) => setUnitForm({ ...unitForm, floor: v })} placeholder="اختر الدور" options={FLOORS.map(f => ({ value: f, label: f }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">المساحة (م²)</Label>
                          <Input type="number" value={unitForm.area ?? ''} onChange={(e) => setUnitForm({ ...unitForm, area: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="80" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الحالة</Label>
                          <NativeSelect value={unitForm.status ?? ''} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })} options={UNIT_STATUSES.map(s => ({ value: s, label: s }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">ملاحظات</Label>
                          <Input value={unitForm.notes || ''} onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })} placeholder="ملاحظات" />
                        </div>
                      </div>

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
                              <NativeSelect value={unitForm.payment_type || 'annual'} onValueChange={(v) => setUnitForm({ ...unitForm, payment_type: v })} options={PAYMENT_TYPES} />
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
                                    const rent = safeNumber(tenant.rent_amount);
                                    if (tenant.payment_type === 'monthly') return (safeNumber(tenant.payment_amount) || rent / 12);
                                    if (tenant.payment_type === 'multi') return (safeNumber(tenant.payment_amount) || rent / (tenant.payment_count || 1));
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
                                      onClick={() => upsertPayment.mutate({ contract_id: tenant.contract_id, paid_months: paid - 1 })} aria-label="إنقاص دفعة">
                                      <MinusIcon className="w-3 h-3" />
                                    </Button>
                                    <span className={`min-w-[3rem] text-center font-semibold ${isComplete ? 'text-success' : 'text-destructive'}`}>{paid}/12</span>
                                    <Button variant="outline" size="icon" className="h-7 w-7" disabled={paid >= 12 || upsertPayment.isPending} aria-label="إضافة دفعة"
                                      onClick={() => {
                                        const rent = safeNumber(tenant.rent_amount);
                                        const monthlyAmount = tenant.payment_type === 'monthly' ? (safeNumber(tenant.payment_amount) || rent / 12)
                                          : tenant.payment_type === 'multi' ? (safeNumber(tenant.payment_amount) || rent / (tenant.payment_count || 1))
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
                                  ? <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">منتظم</Badge>
                                  : <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">متأخر ({ps.overdueCount} دفعة)</Badge>;
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditUnit(unit)} aria-label="تعديل الوحدة"><Edit className="w-3 h-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteUnitTarget(unit)} aria-label="حذف الوحدة"><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                          <NativeSelect value={wholeRentalForm.payment_type} onValueChange={(v) => setWholeRentalForm({ ...wholeRentalForm, payment_type: v })} options={PAYMENT_TYPES} />
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

export default PropertyUnitsDialog;
