/** حوار إدارة وحدات العقار — مكون تنسيقي يجمع المكونات الفرعية */
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUnits, UnitRow } from '@/hooks/useUnits';
import { useCreateUnit, useUpdateUnit, useDeleteUnit } from '@/hooks/useUnits';
import { useCreateContract, useUpdateContract } from '@/hooks/useContracts';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { Property, Contract } from '@/types/database';
import { Plus, Building2, Home, DoorOpen } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import { generateUnitsPDF, UnitPdfRow } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { toast } from 'sonner';

import UnitFormCard, { type UnitFormData } from './units/UnitFormCard';
import MobileUnitCard from './units/MobileUnitCard';
import MobileSummaryCard from './units/MobileSummaryCard';
import DesktopUnitsTable from './units/DesktopUnitsTable';
import WholePropertyTab, { type WholeRentalForm } from './units/WholePropertyTab';
import DeleteUnitDialog from './units/DeleteUnitDialog';
import { getTenantFromContracts } from './units/helpers';

interface PropertyUnitsDialogProps {
  property: Property;
  contracts: Contract[];
  onClose: () => void;
}

const PropertyUnitsDialog = ({ property, contracts, onClose }: PropertyUnitsDialogProps) => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: units = [], isLoading } = useUnits(property.id);
  const { data: tenantPayments = [] } = useTenantPayments();

  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const createContract = useCreateContract();
  const updateContractMutation = useUpdateContract();

  const [rentalMode, setRentalMode] = useState<'units' | 'whole'>('units');
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<UnitRow | null>(null);

  const defaultForm: UnitFormData = {
    property_id: property.id, unit_number: '', unit_type: 'شقة', floor: '', area: undefined, status: 'شاغرة', notes: '',
    tenant_name: '', rent_amount: '', payment_type: 'annual', payment_count: '1', contract_start_date: '', contract_end_date: '',
  };

  const [unitForm, setUnitForm] = useState<UnitFormData>(defaultForm);

  const resetUnitForm = () => {
    setUnitForm(defaultForm);
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

  const getPaymentInfo = (contractId: string) => {
    const payment = tenantPayments.find(p => p.contract_id === contractId);
    return payment ? payment.paid_months : 0;
  };

  const wholePropertyContracts = contracts.filter(c => c.property_id === property.id && !c.unit_id).sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
  });
  const wholePropertyContract = wholePropertyContracts[0] || null;

  const handleWholePropertySave = async (form: WholeRentalForm) => {
    if (!form.tenant_name || !form.rent_amount || !form.start_date || !form.end_date) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const rentAmount = parseFloat(form.rent_amount);
    const paymentCount = form.payment_type === 'monthly' ? 12 : form.payment_type === 'multi' ? parseInt(form.payment_count || '1') : 1;
    const paymentAmount = rentAmount / paymentCount;

    if (wholePropertyContract) {
      await updateContractMutation.mutateAsync({
        id: wholePropertyContract.id, tenant_name: form.tenant_name, rent_amount: rentAmount,
        payment_type: form.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        start_date: form.start_date, end_date: form.end_date,
      });
    } else {
      await createContract.mutateAsync({
        contract_number: `C-${property.property_number}-WHOLE-${Date.now().toString(36)}`,
        property_id: property.id, tenant_name: form.tenant_name, rent_amount: rentAmount,
        start_date: form.start_date, end_date: form.end_date, status: 'active',
        payment_type: form.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
      });
    }
  };

  const rented = units.filter(u => u.status === 'مؤجرة').length;
  const vacant = units.filter(u => u.status === 'شاغرة').length;
  const maintenance = units.filter(u => u.status === 'صيانة').length;

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
                      const tenant = getTenantFromContracts(u.id, contracts);
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
                <UnitFormCard
                  form={unitForm}
                  onChange={setUnitForm}
                  onSubmit={handleUnitSubmit}
                  onCancel={resetUnitForm}
                  isEditing={!!editingUnit}
                  isPending={createUnit.isPending || updateUnit.isPending || createContract.isPending || updateContractMutation.isPending}
                />
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
                <div>
                  {/* بطاقات الجوال */}
                  <div className="space-y-3 md:hidden">
                    {units.map((unit) => {
                      const tenant = getTenantFromContracts(unit.id, contracts);
                      const paid = tenant ? getPaymentInfo(tenant.contract_id) : 0;
                      return (
                        <MobileUnitCard
                          key={unit.id}
                          unit={unit}
                          tenant={tenant}
                          paidMonths={paid}
                          onEdit={handleEditUnit}
                          onDelete={setDeleteUnitTarget}
                        />
                      );
                    })}
                  </div>

                  {/* ملخص الإجماليات على الجوال */}
                  <MobileSummaryCard units={units} contracts={contracts} wholePropertyContracts={wholePropertyContracts} />

                  {/* جدول سطح المكتب */}
                  <DesktopUnitsTable
                    units={units}
                    contracts={contracts}
                    wholePropertyContracts={wholePropertyContracts}
                    tenantPayments={tenantPayments}
                    onEdit={handleEditUnit}
                    onDelete={setDeleteUnitTarget}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="whole">
              <WholePropertyTab
                wholePropertyContract={wholePropertyContract}
                onSave={handleWholePropertySave}
                isPending={createContract.isPending || updateContractMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DeleteUnitDialog
        unit={deleteUnitTarget}
        onClose={() => setDeleteUnitTarget(null)}
        onConfirm={handleConfirmDeleteUnit}
      />
    </>
  );
};

export default PropertyUnitsDialog;
