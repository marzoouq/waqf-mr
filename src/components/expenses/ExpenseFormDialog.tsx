import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { EXPENSE_TYPES } from '@/constants';
import { fmt } from '@/utils/format';

interface ExpenseFormData {
  expense_type: string;
  amount: string;
  date: string;
  property_id: string;
  description: string;
}

interface Property {
  id: string;
  property_number: string;
  location: string;
}

interface ExpenseFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  formData: ExpenseFormData;
  setFormData: (data: ExpenseFormData) => void;
  isEditing: boolean;
  isPending: boolean;
  properties: Property[];
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  disabled?: boolean;
  vatEnabled?: boolean;
  onVatChange?: (enabled: boolean) => void;
}

const ExpenseFormDialog = ({ isOpen, setIsOpen, formData, setFormData, isEditing, isPending, properties, onSubmit, onReset, disabled, vatEnabled = false, onVatChange }: ExpenseFormDialogProps) => {
  const vatRate = vatEnabled ? 15 : 0;
  const amount = parseFloat(formData.amount) || 0;
  const vatAmount = amount * vatRate / 100;

  const expenseTypeOptions = EXPENSE_TYPES.map(type => ({ value: type, label: type }));
  const propertyOptions = properties.map(p => ({ value: p.id, label: `${p.property_number} - ${p.location}` }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) onReset(); }}>
      <DialogTrigger asChild><Button className="gradient-primary gap-2" disabled={disabled}><Plus className="w-4 h-4" />إضافة مصروف</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</DialogTitle><DialogDescription className="sr-only">نموذج إضافة أو تعديل مصروف</DialogDescription></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>نوع المصروف *</Label>
            <NativeSelect
              value={formData.expense_type}
              onValueChange={(value) => setFormData({ ...formData, expense_type: value })}
              options={expenseTypeOptions}
              placeholder="اختر نوع المصروف"
            />
          </div>
          <div className="space-y-2"><Label>المبلغ (ر.س) *</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="1000" /></div>

          {/* VAT Toggle */}
          {onVatChange && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">خاضعة لضريبة القيمة المضافة</Label>
                {vatEnabled && amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    VAT {vatRate}%: {fmt(vatAmount)} ر.س — الإجمالي: {fmt(amount + vatAmount)} ر.س
                  </p>
                )}
              </div>
              <Switch checked={vatEnabled} onCheckedChange={onVatChange} />
            </div>
          )}

          <div className="space-y-2"><Label>التاريخ *</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>العقار (اختياري)</Label>
            <NativeSelect
              value={formData.property_id}
              onValueChange={(value) => setFormData({ ...formData, property_id: value })}
              options={propertyOptions}
              placeholder="اختر العقار"
            />
          </div>
          <div className="space-y-2"><Label>الوصف</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف إضافي" /></div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 gradient-primary" disabled={isPending}>{isEditing ? 'تحديث' : 'إضافة'}</Button>
            <Button type="button" variant="outline" onClick={() => { setIsOpen(false); onReset(); }}>إلغاء</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseFormDialog;
