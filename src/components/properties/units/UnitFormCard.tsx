/** نموذج إضافة/تعديل وحدة */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { UNIT_TYPES, FLOORS, UNIT_STATUSES, PAYMENT_TYPES } from './constants';
import { fmt } from '@/utils/format';
import type { UnitInsert } from '@/hooks/useUnits';

export interface UnitFormData extends UnitInsert {
  tenant_name?: string;
  rent_amount?: string;
  payment_type?: string;
  payment_count?: string;
  contract_start_date?: string;
  contract_end_date?: string;
}

interface UnitFormCardProps {
  form: UnitFormData;
  onChange: (form: UnitFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  isPending: boolean;
}

const UnitFormCard = ({ form, onChange, onSubmit, onCancel, isEditing, isPending }: UnitFormCardProps) => {
  const computedPaymentAmount = form.rent_amount
    ? parseFloat(form.rent_amount) / (form.payment_type === 'monthly' ? 12 : form.payment_type === 'quarterly' ? 4 : form.payment_type === 'semi_annual' || form.payment_type === 'semi-annual' ? 2 : form.payment_type === 'multi' ? parseInt(form.payment_count || '1') : 1)
    : 0;

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">رقم الوحدة *</Label>
              <Input value={form.unit_number} onChange={(e) => onChange({ ...form, unit_number: e.target.value })} placeholder="شقة 1" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">النوع</Label>
              <NativeSelect value={form.unit_type ?? ''} onValueChange={(v) => onChange({ ...form, unit_type: v })} options={UNIT_TYPES.map(t => ({ value: t, label: t }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الدور</Label>
              <NativeSelect value={form.floor || ''} onValueChange={(v) => onChange({ ...form, floor: v })} placeholder="اختر الدور" options={FLOORS.map(f => ({ value: f, label: f }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">المساحة (م²)</Label>
              <Input type="number" value={form.area ?? ''} onChange={(e) => onChange({ ...form, area: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="80" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الحالة</Label>
              <NativeSelect value={form.status ?? ''} onValueChange={(v) => onChange({ ...form, status: v })} options={UNIT_STATUSES.map(s => ({ value: s, label: s }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ملاحظات</Label>
              <Input value={form.notes || ''} onChange={(e) => onChange({ ...form, notes: e.target.value })} placeholder="ملاحظات" />
            </div>
          </div>

          {form.status === 'مؤجرة' && (
            <div className="border-t pt-3 mt-3 space-y-3">
              <h4 className="font-semibold text-sm text-primary">بيانات الإيجار</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">اسم المستأجر *</Label>
                  <Input value={form.tenant_name || ''} onChange={(e) => onChange({ ...form, tenant_name: e.target.value })} placeholder="اسم المستأجر" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">قيمة الإيجار السنوي *</Label>
                  <Input type="number" value={form.rent_amount || ''} onChange={(e) => onChange({ ...form, rent_amount: e.target.value })} placeholder="50000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">نوع الدفع</Label>
                  <NativeSelect value={form.payment_type || 'annual'} onValueChange={(v) => onChange({ ...form, payment_type: v })} options={PAYMENT_TYPES} />
                </div>
                {form.payment_type === 'multi' && (
                  <div className="space-y-1">
                    <Label className="text-xs">عدد الدفعات</Label>
                    <Input type="number" value={form.payment_count || '1'} onChange={(e) => onChange({ ...form, payment_count: e.target.value })} placeholder="4" min="1" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">تاريخ بداية العقد *</Label>
                  <Input type="date" value={form.contract_start_date || ''} onChange={(e) => onChange({ ...form, contract_start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">تاريخ نهاية العقد *</Label>
                  <Input type="date" value={form.contract_end_date || ''} onChange={(e) => onChange({ ...form, contract_end_date: e.target.value })} />
                </div>
              </div>
              {form.rent_amount && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">قيمة الدفعة الواحدة: </span>
                  <span className="font-semibold">{fmt(computedPaymentAmount)} ريال</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isEditing ? 'تحديث' : 'إضافة'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancel}>إلغاء</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UnitFormCard;
