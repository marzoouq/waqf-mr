/** نموذج رفع/تعديل فاتورة */
import { type RefObject, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload, X } from 'lucide-react';

interface InvoiceFormData {
  invoice_number: string;
  invoice_type: string;
  amount: string;
  date: string;
  property_id: string;
  contract_id: string;
  description: string;
  status: string;
}

interface PropertyOption { id: string; property_number: string; location: string }
interface ContractOption { id: string; contract_number: string; tenant_name: string }

interface InvoiceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  isLocked: boolean;
  formData: InvoiceFormData;
  setFormData: (data: InvoiceFormData) => void;
  onSubmit: (e: FormEvent) => void;
  onReset: () => void;
  isSaving: boolean;
  /** رفع الملف */
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  previewUrl: string | null;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  validateAndSetFile: (file: File) => void;
  /** قوائم */
  typeLabels: Record<string, string>;
  properties: PropertyOption[];
  contracts: ContractOption[];
}

const InvoiceUploadDialog = ({
  open, onOpenChange, isEditing, isLocked,
  formData, setFormData, onSubmit, onReset, isSaving,
  fileInputRef, selectedFile, previewUrl, isDragging, setIsDragging, validateAndSetFile,
  typeLabels, properties, contracts,
}: InvoiceUploadDialogProps) => (
  <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) onReset(); }}>
    <DialogTrigger asChild>
      <Button className="gradient-primary gap-2" disabled={isLocked}><Plus className="w-4 h-4" /><span className="hidden sm:inline">رفع فاتورة</span></Button>
    </DialogTrigger>
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'تعديل الفاتورة' : 'رفع فاتورة جديدة'}</DialogTitle>
        <DialogDescription className="sr-only">نموذج رفع أو تعديل فاتورة</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* منطقة رفع الملف */}
        <div className="space-y-2">
          <Label>{isEditing ? 'تغيير ملف الفاتورة (اختياري)' : 'ملف الفاتورة (صورة أو PDF) *'}</Label>
          <div
            className={`border-2 rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5 border-solid' : 'border-dashed hover:border-primary/50'}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) validateAndSetFile(file); }}
          >
            {previewUrl && selectedFile ? (
              <div className="relative inline-block">
                <img src={previewUrl} alt="معاينة" className="max-h-32 rounded-md mx-auto object-contain" />
                <button type="button" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5" onClick={(e) => { e.stopPropagation(); onReset(); }}>
                  <X className="w-3.5 h-3.5" />
                </button>
                <p className="text-xs text-muted-foreground mt-1">{selectedFile.name}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">اضغط أو اسحب ملف هنا</p>
                <p className="text-xs text-muted-foreground">صور (JPG, PNG) أو PDF — حد أقصى 10 ميجا</p>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) validateAndSetFile(file); }} />
        </div>

        {/* حقول النموذج */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor="invoice-number">رقم الفاتورة</Label><Input id="invoice-number" name="invoice_number" value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} placeholder="INV-001" /></div>
          <div className="space-y-2"><Label htmlFor="invoice-amount">المبلغ (ر.س) *</Label><Input id="invoice-amount" name="amount" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="10000" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor="invoice-date">التاريخ *</Label><Input id="invoice-date" name="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
          <div className="space-y-2">
            <Label htmlFor="invoice-type">نوع الفاتورة *</Label>
            <NativeSelect id="invoice-type" value={formData.invoice_type} onValueChange={(v) => setFormData({ ...formData, invoice_type: v })} placeholder="اختر النوع" options={Object.entries(typeLabels).map(([key, label]) => ({ value: key, label }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-property">العقار (اختياري)</Label>
          <NativeSelect id="invoice-property" value={formData.property_id} onValueChange={(v) => setFormData({ ...formData, property_id: v })} placeholder="اختر العقار" options={properties.map((p) => ({ value: p.id, label: `${p.property_number} - ${p.location}` }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoice-contract">العقد (اختياري)</Label>
          <NativeSelect id="invoice-contract" value={formData.contract_id} onValueChange={(v) => setFormData({ ...formData, contract_id: v })} placeholder="اختر العقد" options={contracts.map((c) => ({ value: c.id, label: `${c.contract_number} - ${c.tenant_name}` }))} />
        </div>
        <div className="space-y-2"><Label htmlFor="invoice-description">وصف</Label><Input id="invoice-description" name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف إضافي" /></div>
        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1 gradient-primary" disabled={isSaving}>{isSaving ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'رفع الفاتورة'}</Button>
          <Button type="button" variant="outline" onClick={() => { onOpenChange(false); onReset(); }}>إلغاء</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);

export default InvoiceUploadDialog;
