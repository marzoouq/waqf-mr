/**
 * مودال تعديل بيانات الوقف
 */
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWaqfInfoSave } from '@/hooks/data/settings/useWaqfInfoSave';
import { resizeImage } from '@/utils/image/resizeImage';

interface WaqfField {
  key: string;
  label: string;
}

interface WaqfInfoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: readonly WaqfField[];
  initialData: Record<string, string>;
  currentLogoUrl: string | null;
}

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const VALID_LOGO_EXT: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/svg+xml': ['svg'],
};
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

const WaqfInfoEditDialog: React.FC<WaqfInfoEditDialogProps> = ({
  open, onOpenChange, fields, initialData, currentLogoUrl,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl);
  const [resizing, setResizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { saving, saveWaqfInfo } = useWaqfInfoSave(() => onOpenChange(false));

  // إعادة تعيين البيانات عند فتح المودال
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFormData(initialData);
      setLogoFile(null);
      setLogoPreview(currentLogoUrl);
    }
    onOpenChange(isOpen);
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error('نوع الملف غير مسموح. الأنواع المسموحة: JPG, PNG, WEBP, SVG');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !VALID_LOGO_EXT[file.type]?.includes(ext)) {
      toast.error('امتداد الملف لا يتطابق مع نوعه');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }

    // تصغير الصورة تلقائياً
    setResizing(true);
    try {
      const result = await resizeImage(file, 256, 0.85);
      const resizedFile = new File([result.blob], file.name, { type: result.blob.type });
      setLogoFile(resizedFile);
      if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
      setLogoPreview(URL.createObjectURL(result.blob));

      if (result.wasResized) {
        toast.success(`تم تصغير الشعار تلقائياً (${result.originalWidth}×${result.originalHeight} → ${result.newWidth}×${result.newHeight})`);
      }
    } catch {
      toast.error('فشل معالجة الصورة');
    } finally {
      setResizing(false);
    }
  };

  const handleSave = () => saveWaqfInfo(fields, formData, logoFile, currentLogoUrl);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">تعديل بيانات الوقف</DialogTitle>
          <DialogDescription className="sr-only">نموذج تعديل بيانات الوقف</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* رفع الشعار */}
          <div className="space-y-2">
            <Label>شعار الوقف</Label>
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="شعار الوقف" className="w-16 h-16 rounded-lg object-contain border" />
                  <button
                    type="button"
                    onClick={() => {
                      if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="absolute -top-2 -left-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={resizing}>
                {resizing ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 ml-2" />
                )}
                {resizing ? 'جارٍ المعالجة...' : logoPreview ? 'تغيير' : 'رفع شعار'}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
            </div>
            <p className="text-xs text-muted-foreground">يظهر في رأس صفحة الطباعة (حد أقصى 2 ميجابايت)</p>
          </div>

          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={formData[field.key] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                maxLength={500}
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaqfInfoEditDialog;
