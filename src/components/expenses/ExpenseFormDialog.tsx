import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Upload, X, FileText, ImageIcon, Paperclip } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EXPENSE_TYPES } from '@/constants';
import { fmt } from '@/utils/format/format';
import type { ExpenseFieldErrors, ExpenseFormInput } from '@/utils/financial/expenses/expenseFormValidation';
import type { StagedFile } from '@/hooks/ui/useMultipleFilesUpload';
import { DEFAULT_MAX_FILES } from '@/hooks/ui/useMultipleFilesUpload';

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

  const totalAttachments = existingAttachments.length + stagedFiles.length;
  const remainingSlots = DEFAULT_MAX_FILES - totalAttachments;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging?.(false);
    if (e.dataTransfer.files) onAddFiles?.(e.dataTransfer.files);
  };

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

          {/* المرفقات */}
          {onAddFiles && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5"><Paperclip className="w-4 h-4" />المرفقات (اختياري)</Label>
                <span className="text-xs text-muted-foreground">{totalAttachments}/{DEFAULT_MAX_FILES}</span>
              </div>
              <p className="text-xs text-muted-foreground">PDF أو صور (JPG/PNG/WEBP) — حتى 10 ملفات، كل ملف بحد أقصى 10 ميجابايت. تظهر في إفصاح المستفيد.</p>

              {/* مرفقات موجودة */}
              {existingAttachments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">مرفقات حالية:</p>
                  {existingAttachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{att.file_name || 'مستند'}</span>
                      </div>
                      {onDeleteExisting && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                          disabled={deletingExistingId === att.id}
                          onClick={() => onDeleteExisting(att.id, att.file_path)}
                          aria-label="حذف المرفق">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* منطقة الرفع */}
              {remainingSlots > 0 && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging?.(true); }}
                  onDragLeave={() => setIsDragging?.(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors',
                    isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                  )}
                  onClick={() => fileInputRef?.current?.click()}
                >
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-sm text-muted-foreground">اسحب الملفات هنا أو انقر للاختيار</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => onAddFiles(e.target.files)}
                  />
                </div>
              )}

              {filesError && <p role="alert" className="text-sm text-destructive">{filesError}</p>}

              {/* الملفات الجاهزة للرفع */}
              {stagedFiles.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">جاهزة للرفع:</p>
                  {stagedFiles.map((sf) => (
                    <div key={sf.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-background">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {sf.previewUrl ? (
                          <img src={sf.previewUrl} alt="" className="w-8 h-8 object-cover rounded shrink-0" />
                        ) : sf.file.type.startsWith('image/') ? (
                          <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{sf.file.name}</p>
                          <p className="text-xs text-muted-foreground">{(sf.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={() => onRemoveStaged?.(sf.id)} aria-label="إزالة الملف">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
