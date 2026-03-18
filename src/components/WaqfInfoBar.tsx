import { useState, useRef } from 'react';
import { useWaqfInfo } from '@/hooks/useAppSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ScrollText, User, Landmark, Info, Pencil, Upload, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const FIELDS = [
  { key: 'waqf_name', label: 'اسم الوقف', icon: Building2 },
  { key: 'waqf_founder', label: 'الواقف', icon: User },
  { key: 'waqf_admin', label: 'الناظر', icon: User },
  { key: 'waqf_deed_number', label: 'رقم صك الوقف', icon: ScrollText },
  { key: 'waqf_deed_date', label: 'تاريخ صك الوقف', icon: ScrollText },
  { key: 'waqf_nazara_number', label: 'رقم صك النظارة', icon: ScrollText },
  { key: 'waqf_nazara_date', label: 'تاريخ صك النظارة', icon: ScrollText },
  { key: 'waqf_court', label: 'المحكمة', icon: Landmark },
] as const;

const WaqfInfoBar = () => {
  const { data: waqfInfo, isLoading } = useWaqfInfo();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEdit = () => {
    if (!waqfInfo) return;
    setFormData({
      waqf_name: waqfInfo.waqf_name,
      waqf_founder: waqfInfo.waqf_founder,
      waqf_admin: waqfInfo.waqf_admin,
      waqf_deed_number: waqfInfo.waqf_deed_number,
      waqf_deed_date: waqfInfo.waqf_deed_date,
      waqf_nazara_number: waqfInfo.waqf_nazara_number,
      waqf_nazara_date: waqfInfo.waqf_nazara_date,
      waqf_court: waqfInfo.waqf_court,
    });
    setLogoFile(null);
    setLogoPreview(waqfInfo.waqf_logo_url || null);
    setEditOpen(true);
  };

  const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  const VALID_LOGO_EXT: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/svg+xml': ['svg'],
  };
  const MAX_LOGO_SIZE = 2 * 1024 * 1024;

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
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload logo if changed
      let logoUrl = waqfInfo?.waqf_logo_url || '';
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

      // حفظ رابط الشعار — upsert لضمان إنشاء المفتاح إذا لم يكن موجوداً
      await supabase
        .from('app_settings')
        .upsert({ key: 'waqf_logo_url', value: logoUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      for (const field of FIELDS) {
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
      setEditOpen(false);
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-2 bg-muted/50">
        <Skeleton className="h-8 w-64 mx-auto" />
      </div>
    );
  }

  if (!waqfInfo?.waqf_name) return null;

  const displayFields = FIELDS.filter((f) => f.key !== 'waqf_name');

  return (
    <>
      <div className="flex-1 gradient-gold px-4 py-2 shadow-sm">
        <div className="flex items-center justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group">
                {waqfInfo.waqf_logo_url ? (
                  <img src={waqfInfo.waqf_logo_url} alt="شعار الوقف" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <span className="font-display font-bold text-sm md:text-base text-primary-foreground">
                  {waqfInfo.waqf_name}
                </span>
                <Info className="w-4 h-4 text-primary-foreground/60 group-hover:text-primary-foreground transition-colors" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 md:w-96 max-w-[calc(100vw-2rem)] p-0" align="center" sideOffset={8}>
              <div className="gradient-hero rounded-t-md p-3 flex items-center justify-center gap-2">
                <h3 className="font-display font-bold text-sidebar-foreground text-lg">
                  {waqfInfo.waqf_name}
                </h3>
                {role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    onClick={openEdit}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="p-4 space-y-3">
                {displayFields.map((field) => {
                  const value = waqfInfo[field.key as keyof typeof waqfInfo];
                  if (!value) return null;
                  return (
                    <div key={field.key} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <field.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{field.label}</p>
                        <p className="text-sm font-medium text-foreground">{value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">تعديل بيانات الوقف</DialogTitle>
            <DialogDescription className="sr-only">نموذج تعديل بيانات الوقف</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>شعار الوقف</Label>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <div className="relative">
                    <img src={logoPreview} alt="شعار الوقف" className="w-16 h-16 rounded-lg object-contain border" />
                    <button
                      type="button"
                      onClick={() => {
                        if (logoPreview && logoPreview.startsWith('blob:')) {
                          URL.revokeObjectURL(logoPreview);
                        }
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 ml-2" />
                  {logoPreview ? 'تغيير' : 'رفع شعار'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>
              <p className="text-xs text-muted-foreground">يظهر في رأس صفحة الطباعة (حد أقصى 2 ميجابايت)</p>
            </div>

            {FIELDS.map((field) => (
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
              <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WaqfInfoBar;
