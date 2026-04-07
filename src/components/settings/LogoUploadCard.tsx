/**
 * بطاقة رفع شعار مشتركة — تُستخدم في إعدادات الوقف والواجهة الرئيسية
 */
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Upload, X, Loader2 } from 'lucide-react';
import { defaultNotify } from '@/lib/notify';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { resizeImage } from '@/utils/image/resizeImage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024;

interface LogoUploadCardProps {
  title: string;
  description: string;
  settingKey: string;
  storagePath: string;
  currentUrl: string;
}

const LogoUploadCard: React.FC<LogoUploadCardProps> = ({
  title, description, settingKey, storagePath, currentUrl,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(currentUrl);
  const [saving, setSaving] = useState(false);

  // مزامنة مع التغييرات الخارجية
  if (currentUrl !== preview && !saving) {
    setPreview(currentUrl);
  }

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      defaultNotify.error('نوع الملف غير مسموح. الأنواع المسموحة: JPG, PNG, WEBP, SVG');
      return;
    }
    if (file.size > MAX_SIZE) {
      defaultNotify.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
      return;
    }

    setSaving(true);
    try {
      const result = await resizeImage(file, 256, 0.85);
      const resizedFile = new File([result.blob], file.name, { type: result.blob.type });
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${storagePath}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('waqf-assets')
        .upload(path, resizedFile, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('waqf-assets').getPublicUrl(path);
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from('app_settings')
        .upsert({ key: settingKey, value: logoUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      await queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      setPreview(logoUrl);
      defaultNotify.success('تم رفع الشعار بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء رفع الشعار');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await supabase
        .from('app_settings')
        .upsert({ key: settingKey, value: '', updated_at: new Date().toISOString() }, { onConflict: 'key' });
      await queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      setPreview('');
      defaultNotify.success('تم إزالة الشعار');
    } catch {
      defaultNotify.error('حدث خطأ أثناء الإزالة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt={title} className="w-16 h-16 rounded-lg object-contain border" />
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 ml-2" />
            )}
            {saving ? 'جارٍ الرفع...' : preview ? 'تغيير' : 'رفع شعار'}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSelect} />
        </div>
      </CardContent>
    </Card>
  );
};

export default LogoUploadCard;
