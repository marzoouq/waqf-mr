/**
 * IncomeFormDialog — مكوّن نموذج إضافة/تعديل دخل
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Income } from '@/types';
import type { IncomeFieldErrors, IncomeFormInput } from '@/utils/financial/collection/incomeFormValidation';

interface Property { id: string; property_number: string; location: string; }

export type IncomeFormData = IncomeFormInput;

interface IncomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingIncome: Income | null;
  formData: IncomeFormData;
  setFormData: (data: IncomeFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  isPending: boolean;
  isLocked: boolean;
  properties: Property[];
  errors?: IncomeFieldErrors;
  onFieldBlur?: (field: keyof IncomeFormInput) => void;
}

const errCls = (hasErr?: string) => cn(hasErr && 'border-destructive focus-visible:ring-destructive');

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? <p id={id} role="alert" className="text-sm text-destructive">{message}</p> : null;

const IncomeFormDialog: React.FC<IncomeFormDialogProps> = ({
  open, onOpenChange, editingIncome, formData, setFormData,
  onSubmit, onReset, isPending, isLocked, properties,
  errors = {}, onFieldBlur,
}) => (
  <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) onReset(); }}>
    <DialogTrigger asChild>
      <Button className="gradient-primary gap-2" disabled={isLocked}>
        <Plus className="w-4 h-4" /><span className="hidden sm:inline">إضافة دخل</span>
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{editingIncome ? 'تعديل الدخل' : 'إضافة دخل جديد'}</DialogTitle>
        <DialogDescription className="sr-only">نموذج إضافة أو تعديل دخل</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="income-source">المصدر *</Label>
          <Input id="income-source" name="income-source" value={formData.source}
            aria-invalid={!!errors.source} aria-describedby={errors.source ? 'income-source-error' : undefined}
            className={errCls(errors.source)}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            onBlur={() => onFieldBlur?.('source')}
            placeholder="إيجار، استثمار، تبرع..." />
          <FieldError id="income-source-error" message={errors.source} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="income-amount">المبلغ (ر.س) *</Label>
          <Input id="income-amount" name="income-amount" type="number" value={formData.amount}
            aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'income-amount-error' : undefined}
            className={errCls(errors.amount)}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            onBlur={() => onFieldBlur?.('amount')}
            placeholder="10000" />
          <FieldError id="income-amount-error" message={errors.amount} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="income-date">التاريخ *</Label>
          <Input id="income-date" name="income-date" type="date" value={formData.date}
            aria-invalid={!!errors.date} aria-describedby={errors.date ? 'income-date-error' : undefined}
            className={errCls(errors.date)}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            onBlur={() => onFieldBlur?.('date')} />
          <FieldError id="income-date-error" message={errors.date} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="income-property">العقار (اختياري)</Label>
          <NativeSelect id="income-property" value={formData.property_id}
            onValueChange={(value) => setFormData({ ...formData, property_id: value })}
            placeholder="اختر العقار"
            options={properties.map((p) => ({ value: p.id, label: `${p.property_number} - ${p.location}` }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="income-notes">ملاحظات</Label>
          <Input id="income-notes" name="income-notes" value={formData.notes}
            aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'income-notes-error' : undefined}
            className={errCls(errors.notes)}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            onBlur={() => onFieldBlur?.('notes')}
            placeholder="ملاحظات إضافية" />
          <FieldError id="income-notes-error" message={errors.notes} />
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1 gradient-primary" disabled={isPending}>
            {editingIncome ? 'تحديث' : 'إضافة'}
          </Button>
          <Button type="button" variant="outline" onClick={() => { onOpenChange(false); onReset(); }}>
            إلغاء
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);

export default IncomeFormDialog;
