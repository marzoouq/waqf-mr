import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EXPENSE_TYPES } from '@/constants';
import { fmt } from '@/utils/format/format';
import type { ExpenseFieldErrors, ExpenseFormInput } from '@/utils/financial/expenses/expenseFormValidation';
import type { StagedFile } from '@/hooks/ui/useMultipleFilesUpload';
import ExpenseAttachmentsUploader from './ExpenseAttachmentsUploader';

type ExpenseFormData = ExpenseFormInput;

interface Property { id: string; property_number: string; location: string; }
interface ExistingAttachment { id: string; file_name: string | null; file_path: string | null; }

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
  errors?: ExpenseFieldErrors;
  onFieldBlur?: (field: keyof ExpenseFormInput) => void;
  // مرفقات جديدة (قبل الرفع)
  stagedFiles?: StagedFile[];
  filesError?: string;
  isDragging?: boolean;
  setIsDragging?: (v: boolean) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onAddFiles?: (list: FileList | File[] | null) => void;
  onRemoveStaged?: (id: string) => void;
  // مرفقات موجودة (وضع التعديل)
  existingAttachments?: ExistingAttachment[];
  onDeleteExisting?: (id: string, filePath: string | null) => void;
  deletingExistingId?: string | null;
}

const errCls = (hasErr?: string) => cn(hasErr && 'border-destructive focus-visible:ring-destructive');
const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? <p id={id} role="alert" className="text-sm text-destructive">{message}</p> : null;

const ExpenseFormDialog = ({
  isOpen, setIsOpen, formData, setFormData, isEditing, isPending, properties,
  onSubmit, onReset, disabled, vatEnabled = false, onVatChange,
  errors = {}, onFieldBlur,
  stagedFiles = [], filesError, isDragging = false, setIsDragging, fileInputRef,
  onAddFiles, onRemoveStaged,
  existingAttachments = [], onDeleteExisting, deletingExistingId,
}: ExpenseFormDialogProps) => {
  const vatRate = vatEnabled ? 15 : 0;
  const amount = parseFloat(formData.amount) || 0;
  const vatAmount = amount * vatRate / 100;

  const VAT_BLOCKED = /ضريبة\s*القيمة\s*المضافة|vat/i;
  const expenseTypeOptions = EXPENSE_TYPES
    .filter(type => !VAT_BLOCKED.test(type))
    .map(type => ({ value: type, label: type }));
  const propertyOptions = properties.map(p => ({ value: p.id, label: `${p.property_number} - ${p.location}` }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) onReset(); }}>
      <DialogTrigger asChild>
        <Button className="gradient-primary gap-2" disabled={disabled}><Plus className="w-4 h-4" />إضافة مصروف</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</DialogTitle>
          <DialogDescription className="sr-only">نموذج إضافة أو تعديل مصروف مع إمكانية إرفاق فواتير</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="expense-type">نوع المصروف *</Label>
            <NativeSelect id="expense-type" value={formData.expense_type}
              onValueChange={(value) => setFormData({ ...formData, expense_type: value })}
              options={expenseTypeOptions}
              placeholder="اختر نوع المصروف"
              triggerClassName={errCls(errors.expense_type)} />
            <FieldError id="expense-type-error" message={errors.expense_type} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-amount">المبلغ (ر.س) *</Label>
            <Input name="amount" id="expense-amount" type="number" value={formData.amount}
              aria-invalid={!!errors.amount} aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
              className={errCls(errors.amount)}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              onBlur={() => onFieldBlur?.('amount')}
              placeholder="1000" />
            <FieldError id="expense-amount-error" message={errors.amount} />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="expense-date">التاريخ *</Label>
            <Input name="date" id="expense-date" type="date" value={formData.date}
              aria-invalid={!!errors.date} aria-describedby={errors.date ? 'expense-date-error' : undefined}
              className={errCls(errors.date)}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              onBlur={() => onFieldBlur?.('date')} />
            <FieldError id="expense-date-error" message={errors.date} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-property">العقار (اختياري)</Label>
            <NativeSelect id="expense-property" value={formData.property_id}
              onValueChange={(value) => setFormData({ ...formData, property_id: value })}
              options={propertyOptions}
              placeholder="اختر العقار" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-description">الوصف</Label>
            <Input name="description" id="expense-description" value={formData.description}
              aria-invalid={!!errors.description} aria-describedby={errors.description ? 'expense-description-error' : undefined}
              className={errCls(errors.description)}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onBlur={() => onFieldBlur?.('description')}
              placeholder="وصف إضافي" />
            <FieldError id="expense-description-error" message={errors.description} />
          </div>

          {onAddFiles && (
            <ExpenseAttachmentsUploader
              stagedFiles={stagedFiles}
              filesError={filesError}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              fileInputRef={fileInputRef}
              onAddFiles={onAddFiles}
              onRemoveStaged={onRemoveStaged}
              existingAttachments={existingAttachments}
              onDeleteExisting={onDeleteExisting}
              deletingExistingId={deletingExistingId}
            />
          )}

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
