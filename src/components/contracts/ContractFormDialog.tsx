import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUnits } from '@/hooks/useUnits';
import { Contract } from '@/types/database';
import { toast } from 'sonner';

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContract: Contract | null;
  properties: Array<{ id: string; property_number: string; location: string }>;
  onSubmit: (formData: ContractFormData, isEditing: boolean) => Promise<void>;
  onReset: () => void;
  isPending: boolean;
  initialFormData?: ContractFormData;
}

export interface ContractFormData {
  contract_number: string;
  property_id: string;
  unit_id: string;
  tenant_name: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  status: string;
  notes: string;
  payment_type: string;
  payment_count: string;
}

export const emptyFormData: ContractFormData = {
  contract_number: '', property_id: '', unit_id: '', tenant_name: '', start_date: '', end_date: '', rent_amount: '', status: 'active', notes: '',
  payment_type: 'annual', payment_count: '1',
};

const ContractFormDialog = ({ open, onOpenChange, editingContract, properties, onSubmit, onReset, isPending, initialFormData }: ContractFormDialogProps) => {
  const [formData, setFormData] = useState<ContractFormData>(initialFormData || emptyFormData);
  const { data: propertyUnits = [] } = useUnits(formData.property_id || undefined);

  // Sync form when initialFormData changes
  const [lastInitial, setLastInitial] = useState(initialFormData);
  if (initialFormData !== lastInitial) {
    setLastInitial(initialFormData);
    if (initialFormData) setFormData(initialFormData);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contract_number || !formData.property_id || !formData.tenant_name || !formData.start_date || !formData.end_date || !formData.rent_amount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    await onSubmit(formData, !!editingContract);
    onOpenChange(false);
    setFormData(emptyFormData);
    onReset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setFormData(emptyFormData); onReset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editingContract ? 'تعديل العقد' : 'إضافة عقد جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل عقد إيجار</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pl-2">
          <div className="space-y-2"><Label>رقم العقد *</Label><Input value={formData.contract_number} onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })} placeholder="مثال: C-2024-001" /></div>
          <div className="space-y-2">
            <Label>العقار *</Label>
            <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
              <SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger>
              <SelectContent>{properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.property_number} - {p.location}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          {formData.property_id && (
            <div className="space-y-2">
              <Label>الوحدة</Label>
              <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value === 'full' ? '' : value })}>
                <SelectTrigger><SelectValue placeholder="العقار كامل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">العقار كامل</SelectItem>
                  {propertyUnits.map((u) => (<SelectItem key={u.id} value={u.id}>وحدة {u.unit_number}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2"><Label>اسم المستأجر *</Label><Input value={formData.tenant_name} onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })} placeholder="اسم المستأجر" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>تاريخ البداية *</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>تاريخ النهاية *</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>قيمة الإيجار السنوي (ر.س) *</Label><Input type="number" value={formData.rent_amount} onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })} placeholder="10000" /></div>
          <div className="space-y-2">
            <Label>نوع الدفع *</Label>
            <Select value={formData.payment_type} onValueChange={(value) => setFormData({ ...formData, payment_type: value, payment_count: value === 'monthly' ? '12' : value === 'annual' ? '1' : formData.payment_count })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">سنوي (دفعة واحدة)</SelectItem>
                <SelectItem value="monthly">شهري (12 دفعة)</SelectItem>
                <SelectItem value="multi">دفعات متعددة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.payment_type === 'multi' && (
            <div className="space-y-2">
              <Label>عدد الدفعات *</Label>
              <Input type="number" min="2" max="12" value={formData.payment_count} onChange={(e) => setFormData({ ...formData, payment_count: e.target.value })} placeholder="2-12" />
            </div>
          )}
          {formData.rent_amount && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <span className="text-muted-foreground">قيمة الدفعة الواحدة: </span>
              <span className="font-bold text-primary">
                {(parseFloat(formData.rent_amount) / (formData.payment_type === 'monthly' ? 12 : formData.payment_type === 'annual' ? 1 : (parseInt(formData.payment_count) || 1))).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} ر.س
              </span>
            </div>
          )}
          <div className="space-y-2">
            <Label>الحالة</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="expired">منتهي</SelectItem><SelectItem value="pending">معلق</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>ملاحظات</Label><Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="ملاحظات إضافية" /></div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 gradient-primary" disabled={isPending}>{editingContract ? 'تحديث' : 'إضافة'}</Button>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); setFormData(emptyFormData); onReset(); }}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractFormDialog;
