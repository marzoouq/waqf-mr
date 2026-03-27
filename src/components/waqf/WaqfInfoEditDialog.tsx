/**
 * مودال تعديل بيانات الوقف
 */
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>(initialData);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // إعادة تعيين البيانات عند فتح المودال
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFormData(initialData);
      setLogoFile(null);
      setLogoPreview(currentLogoUrl);
    }
    onOpenChange(isOpen);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setLogoFile(file);
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = currentLogoUrl || '';
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('waqf-assets')
          .upload(path, logoFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('waqf-assets').getPublicUrl(path);
        logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      await supabase
        .from('app_settings')
        .upsert({ key: 'waqf_logo_url', value: logoUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      for (const field of fields) {
        const value = (formData[field.key] || '').trim();
        if (value.length > 500) {
          toast.error(`الحقل "${field.label}" طويل جداً`);
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: field.key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      toast.success('تم حفظ بيانات الوقف بنجاح');
      onOpenChange(false);
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

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
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 ml-2" />
                {logoPreview ? 'تغيير' : 'رفع شعار'}
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
