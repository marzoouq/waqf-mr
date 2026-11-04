import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Contract } from '@/types';

import ContractTenantIdSection from './ContractTenantIdSection';
import { type ContractFormData } from '@/types/forms/contract';
import { useContractFormDialog } from '@/hooks/page/admin/contracts/useContractFormDialog';
import ContractRentalModeSection from './contract-form/ContractRentalModeSection';
import ContractPaymentSection from './contract-form/ContractPaymentSection';

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContract: Contract | null;
  properties: Array<{ id: string; property_number: string; location: string }>;
  activeContracts?: Contract[];
  onSubmit: (formData: ContractFormData, isEditing: boolean) => Promise<void>;
  onReset: () => void;
  isPending: boolean;
  initialFormData?: ContractFormData;
}

const ContractFormDialog = ({ open, onOpenChange, editingContract, properties, activeContracts = [], onSubmit, onReset, isPending, initialFormData }: ContractFormDialogProps) => {
  const {
    formData, setFormData,
    propertyUnits,
    fiscalYears,
    occupiedUnitIds,
    handleSubmit,
    toggleUnit,
    isMulti,
    selectedCount,
    perUnitAmount,
    suffixLetters,
    handleClose,
  } = useContractFormDialog({
    editingContract,
    activeContracts,
    onSubmit,
    onOpenChange,
    onReset,
    initialFormData,
  });

  const propertyOptions = properties.map(p => ({ value: p.id, label: `${p.property_number} - ${p.location}` }));

  const statusOptions = [
    { value: 'active', label: 'نشط' },
    { value: 'expired', label: 'منتهي' },
    { value: 'pending', label: 'معلق' },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { handleClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingContract ? 'تعديل العقد' : 'إضافة عقد جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل عقد إيجار</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-sm font-semibold text-primary border-b border-border pb-1">بيانات العقد والعقار</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="contract-number">رقم العقد *</Label><Input id="contract-number" name="contract_number" value={formData.contract_number} onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })} placeholder="مثال: C-2024-001" /></div>
          <div className="space-y-2">
            <Label htmlFor="contract-form-dialog-select-1">العقار *</Label>
            <NativeSelect id="contract-form-dialog-select-1" value={formData.property_id}
              onValueChange={(value) => setFormData({ ...formData, property_id: value, unit_id: '', selected_unit_ids: [], rent_per_unit: {} })}
              options={propertyOptions}
              placeholder="اختر العقار"
            />
          </div>
          </div>

          <ContractRentalModeSection
            formData={formData}
            setFormData={setFormData}
            propertyUnits={propertyUnits}
            occupiedUnitIds={occupiedUnitIds}
            editingContract={editingContract}
            isMulti={isMulti}
            selectedCount={selectedCount}
            toggleUnit={toggleUnit}
          />

          <h3 className="text-sm font-semibold text-primary border-b border-border pb-1">بيانات المستأجر</h3>
          <div className="space-y-2"><Label htmlFor="tenant-name">اسم المستأجر *</Label><Input id="tenant-name" name="tenant_name" value={formData.tenant_name} onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })} placeholder="اسم المستأجر" /></div>

          <ContractTenantIdSection formData={formData} onChange={(patch) => setFormData(prev => ({ ...prev, ...patch }))} />
          <h3 className="text-sm font-semibold text-primary border-b border-border pb-1">المدة والشروط المالية</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="contract-form-dialog-field-3">تاريخ البداية *</Label><Input name="start_date" id="contract-form-dialog-field-2" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="contract-form-dialog-field-4">تاريخ النهاية *</Label><Input name="end_date" id="contract-form-dialog-field-3" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
          </div>

          <ContractPaymentSection
            formData={formData}
            setFormData={setFormData}
            isMulti={isMulti}
            perUnitAmount={perUnitAmount}
            fiscalYears={fiscalYears}
            suffixLetters={suffixLetters}
            selectedCount={selectedCount}
          />

          {!editingContract && (
            <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-success/30 bg-success/10">
              <div className="space-y-0.5">
                <Label htmlFor="pay-first-now" className="cursor-pointer">تم استلام الدفعة الأولى عند التعاقد</Label>
                <p className="text-xs text-muted-foreground">تُسجَّل الدفعة الأولى مسددة ويُقيَّد تحصيلها في إيرادات الوقف فور إنشاء العقد</p>
              </div>
              <Switch id="pay-first-now" checked={formData.pay_first_now} onCheckedChange={(v) => setFormData({ ...formData, pay_first_now: v })} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract-form-dialog-field-4">الحالة</Label>
            <NativeSelect id="contract-form-dialog-select-5" value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              options={statusOptions}
            />
          </div>
          <div className="space-y-2"><Label htmlFor="contract-form-dialog-field-5">ملاحظات</Label><Input name="notes" id="contract-form-dialog-field-5" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" /></div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 gradient-primary" disabled={isPending}>
              {isMulti && selectedCount > 1 ? `إنشاء ${selectedCount} عقود` : editingContract ? 'تحديث' : 'إضافة'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractFormDialog;
