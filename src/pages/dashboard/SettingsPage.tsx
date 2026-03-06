import DashboardLayout from '@/components/DashboardLayout';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, LayoutGrid, Users, Palette, Bell, Save, ShieldCheck, Shield, Upload, Trash2, ImageIcon, Globe, Download, Calendar, Megaphone, LayoutList, FlaskConical, Volume2, Play, Fingerprint } from 'lucide-react';
import { TONE_OPTIONS, NOTIFICATION_TONE_KEY, NOTIFICATION_VOLUME_KEY, VOLUME_OPTIONS, previewTone, type ToneId, type VolumeLevel } from '@/hooks/useNotifications';
import { useAppSettings } from '@/hooks/useAppSettings';
import { lazy, Suspense } from 'react';

const LandingPageTab = lazy(() => import('@/components/settings/LandingPageTab'));
const DataExportTab = lazy(() => import('@/components/settings/DataExportTab'));
const FiscalYearManagementTab = lazy(() => import('@/components/settings/FiscalYearManagementTab'));
const BulkNotificationsTab = lazy(() => import('@/components/settings/BulkNotificationsTab'));
const MenuCustomizationTab = lazy(() => import('@/components/settings/MenuCustomizationTab'));
const BannerSettingsTab = lazy(() => import('@/components/settings/BannerSettingsTab'));
const RolePermissionsTab = lazy(() => import('@/components/settings/RolePermissionsTab'));
const BiometricSettings = lazy(() => import('@/components/settings/BiometricSettings'));
import { useWaqfInfo } from '@/hooks/useAppSettings';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// === Logo Management Component ===
const LogoManager = () => {
  const { data: waqfInfo, isLoading } = useWaqfInfo();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const logoUrl = waqfInfo?.waqf_logo_url;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('الصيغ المسموحة: PNG, JPG, WEBP, SVG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `logo.${ext}`;

      // Delete old logo if exists
      await supabase.storage.from('waqf-assets').remove([filePath]);

      // Also try removing other extensions
      const otherExts = ['png', 'jpg', 'jpeg', 'webp', 'svg'].filter(e => e !== ext);
      await supabase.storage.from('waqf-assets').remove(otherExts.map(e => `logo.${e}`));

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('waqf-assets')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('waqf-assets').getPublicUrl(filePath);

      // Save URL to app_settings with cache-bust
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('app_settings').upsert(
        { key: 'waqf_logo_url', value: newUrl, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

      queryClient.invalidateQueries({ queryKey: ['waqf-info'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      toast.success('تم رفع الشعار بنجاح');
    } catch (err) {
      // Logo upload error — toast handles user notification
      toast.error('حدث خطأ أثناء رفع الشعار');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Remove all possible logo files
      await supabase.storage.from('waqf-assets').remove([
        'logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp', 'logo.svg'
      ]);

      // Clear URL from settings
      await supabase.from('app_settings').upsert(
        { key: 'waqf_logo_url', value: '', updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

      queryClient.invalidateQueries({ queryKey: ['waqf-info'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      toast.success('تم حذف الشعار بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء حذف الشعار');
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          شعار الوقف
        </CardTitle>
        <CardDescription>
          الشعار يظهر في لوحة التحكم وجميع ملفات PDF والتقارير المصدّرة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current logo preview */}
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="شعار الوقف"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
            )}
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground">
              {logoUrl ? 'الشعار الحالي - يمكنك تغييره أو حذفه' : 'لم يتم إضافة شعار بعد'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                {logoUrl ? 'تغيير الشعار' : 'رفع شعار'}
              </Button>
              {logoUrl && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'جارٍ الحذف...' : 'حذف الشعار'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, SVG — حد أقصى 2 ميجابايت</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleUpload}
          className="hidden"
          aria-label="رفع شعار الوقف"
        />
      </CardContent>
    </Card>
  );
};

// === Waqf & Financial Settings Tab ===
const WaqfSettingsTab = () => {
  const { data: settings, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const waqfFields = [
    { key: 'waqf_name', label: 'اسم الوقف' },
    { key: 'waqf_founder', label: 'الواقف' },
    { key: 'waqf_admin', label: 'الناظر' },
    { key: 'waqf_deed_number', label: 'رقم صك الوقف' },
    { key: 'waqf_deed_date', label: 'تاريخ صك الوقف' },
    { key: 'waqf_nazara_number', label: 'رقم صك النظارة' },
    { key: 'waqf_nazara_date', label: 'تاريخ صك النظارة' },
    { key: 'waqf_court', label: 'المحكمة' },
  ];

  const financialFields = [
    { key: 'admin_share_percentage', label: 'نسبة الناظر (%)' },
    { key: 'waqif_share_percentage', label: 'نسبة الواقف (%)' },
    { key: 'fiscal_year', label: 'السنة المالية' },
  ];

  useEffect(() => {
    if (settings) setFormData({ ...settings });
  }, [settings]);

  // F8: السماح بالقيمة الفارغة (تُعامل كصفر) وتحسين رسالة الخطأ
  const validatePercentage = (key: string, label: string, value: string): boolean => {
    if (!key.endsWith('_percentage')) return true;
    if (key === 'fiscal_year') return true;
    if (value.trim() === '' || value.trim() === '0') return true; // السماح بالفارغ/الصفر
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num < 0 || num > 100) {
      toast.error(`${label}: يجب إدخال رقم بين 0 و 100`);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allFields = [...waqfFields, ...financialFields];

      // F12: التحقق من مجموع النسب
      const adminVal = parseFloat(formData['admin_share_percentage'] || '0') || 0;
      const waqifVal = parseFloat(formData['waqif_share_percentage'] || '0') || 0;
      if (adminVal + waqifVal > 100) {
        toast.error('مجموع نسبة الناظر والواقف يتجاوز 100%');
        setSaving(false);
        return;
      }

      // F3: جمع كل البيانات وإرسالها مع التحقق من الأخطاء
      const failedFields: string[] = [];
      for (const field of allFields) {
        const value = (formData[field.key] || '').trim();
        if (value.length > 500) { toast.error(`${field.label} طويل جداً`); setSaving(false); return; }
        if (!validatePercentage(field.key, field.label, value)) { setSaving(false); return; }
        const { error } = await supabase.from('app_settings').upsert(
          { key: field.key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
        if (error) failedFields.push(field.label);
      }
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['waqf-info'] });
      if (failedFields.length > 0) {
        toast.error(`فشل حفظ: ${failedFields.join('، ')}`);
      } else {
        toast.success('تم حفظ البيانات بنجاح');
      }
    } catch { toast.error('حدث خطأ أثناء الحفظ'); } finally { setSaving(false); }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <LogoManager />
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">بيانات الوقف</CardTitle>
          <CardDescription>معلومات الوقف والصكوك</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {waqfFields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input value={formData[f.key] || ''} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))} maxLength={500} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">النسب المالية</CardTitle>
          <CardDescription>نسب الناظر والواقف والسنة المالية</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {financialFields.map((f) => {
            const isPercentField = f.key.endsWith('_percentage');
            return (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type={isPercentField ? 'number' : 'text'}
                  min={isPercentField ? 0 : undefined}
                  max={isPercentField ? 100 : undefined}
                  step={isPercentField ? '0.1' : undefined}
                  value={formData[f.key] || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))}
                  maxLength={100}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
      </Button>
    </div>
  );
};

// === Sections Visibility Tab ===
const SectionsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const defaultSections = { properties: true, contracts: true, income: true, expenses: true, beneficiaries: true, reports: true, accounts: true, users: true };
  const sections = getJsonSetting('sections_visibility', defaultSections);

  const labels: Record<string, string> = {
    properties: 'العقارات', contracts: 'العقود', income: 'الدخل', expenses: 'المصروفات',
    beneficiaries: 'المستفيدين', reports: 'التقارير', accounts: 'الحسابات', users: 'إدارة المستخدمين',
  };

  const toggle = (key: string) => {
    updateJsonSetting('sections_visibility', { ...sections, [key]: !sections[key] });
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">أقسام لوحة التحكم</CardTitle>
        <CardDescription>إظهار أو إخفاء أقسام من القائمة الجانبية</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm font-medium">{label}</span>
            <Switch checked={sections[key] ?? true} onCheckedChange={() => toggle(key)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// === Beneficiary Interface Tab ===
const BeneficiaryTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const defaultSections = { disclosure: true, share: true, accounts: true, reports: true };
  const sections = getJsonSetting('beneficiary_sections', defaultSections);

  const labels: Record<string, string> = {
    disclosure: 'الإفصاح السنوي', share: 'حصتي من الريع', accounts: 'الحسابات الختامية', reports: 'التقارير المالية',
  };

  const toggle = (key: string) => {
    updateJsonSetting('beneficiary_sections', { ...sections, [key]: !sections[key] });
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">واجهة المستفيد</CardTitle>
        <CardDescription>التحكم بالأقسام الظاهرة للمستفيدين</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm font-medium">{label}</span>
            <Switch checked={sections[key] ?? true} onCheckedChange={() => toggle(key)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// === Appearance Tab ===
const AppearanceTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const defaults = { system_name: 'إدارة الوقف' };
  const appearance = getJsonSetting('appearance_settings', defaults);
  const [form, setForm] = useState(appearance);

  useEffect(() => {
    const next = JSON.stringify(appearance);
    setForm((prev: typeof appearance) => JSON.stringify(prev) === next ? prev : appearance);
  }, [appearance]);

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">المظهر والألوان</CardTitle>
          <CardDescription>تخصيص مظهر النظام</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>اسم النظام</Label>
            <Input value={form.system_name} onChange={(e) => setForm((p: typeof form) => ({ ...p, system_name: e.target.value }))} maxLength={100} />
          </div>
          <Button onClick={() => updateJsonSetting('appearance_settings', form)} className="gap-2">
            <Save className="w-4 h-4" />
            حفظ الاسم
          </Button>
        </CardContent>
      </Card>
      <ThemeColorPicker />
    </div>
  );
};

// === Notifications Settings Tab ===
const NotificationsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const defaults = { contract_expiry: true, contract_expiry_days: 30, payment_delays: true, email_notifications: false };
  const settings = getJsonSetting('notification_settings', defaults);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('waqf_notification_sound') !== 'false'; } catch { return true; }
  });

  const [selectedTone, setSelectedTone] = useState<ToneId>(() => {
    try { return (localStorage.getItem(NOTIFICATION_TONE_KEY) || 'chime') as ToneId; } catch { return 'chime'; }
  });

  const [volume, setVolume] = useState<VolumeLevel>(() => {
    try { return (localStorage.getItem(NOTIFICATION_VOLUME_KEY) || 'medium') as VolumeLevel; } catch { return 'medium'; }
  });

  const handleSoundChange = (value: boolean) => {
    setSoundEnabled(value);
    localStorage.setItem('waqf_notification_sound', String(value));
    toast.success(value ? 'تم تفعيل صوت التنبيه' : 'تم تعطيل صوت التنبيه');
  };

  const handleToneChange = (tone: ToneId) => {
    setSelectedTone(tone);
    localStorage.setItem(NOTIFICATION_TONE_KEY, tone);
    const vol = VOLUME_OPTIONS.find(v => v.id === volume)?.gain ?? 0.5;
    previewTone(tone, vol);
  };

  const handleVolumeChange = (level: VolumeLevel) => {
    setVolume(level);
    localStorage.setItem(NOTIFICATION_VOLUME_KEY, level);
    const vol = VOLUME_OPTIONS.find(v => v.id === level)?.gain ?? 0.5;
    previewTone(selectedTone, vol);
  };

  const toggleField = (key: string) => {
    updateJsonSetting('notification_settings', { ...settings, [key]: !settings[key] });
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">إعدادات الإشعارات</CardTitle>
        <CardDescription>التحكم بأنواع الإشعارات التي يتم إرسالها</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium">تنبيهات انتهاء العقود</p>
            <p className="text-xs text-muted-foreground">تنبيه قبل انتهاء العقد بفترة محددة</p>
          </div>
          <Switch checked={settings.contract_expiry} onCheckedChange={() => toggleField('contract_expiry')} />
        </div>
        {settings.contract_expiry && (
          <div className="space-y-1.5 pr-4">
            <Label>عدد الأيام قبل الانتهاء</Label>
            <Input
              type="number"
              value={settings.contract_expiry_days}
              onChange={(e) => updateJsonSetting('notification_settings', { ...settings, contract_expiry_days: parseInt(e.target.value) || 30 })}
              className="w-32"
              min={1}
              max={365}
            />
          </div>
        )}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium">تنبيهات المتأخرات</p>
            <p className="text-xs text-muted-foreground">تنبيه عند تأخر السداد من المستأجرين</p>
          </div>
          <Switch checked={settings.payment_delays} onCheckedChange={() => toggleField('payment_delays')} />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium">إشعارات بالبريد الإلكتروني</p>
            <p className="text-xs text-muted-foreground">إرسال نسخة من الإشعارات إلى بريدك</p>
          </div>
          <Switch checked={settings.email_notifications} onCheckedChange={() => toggleField('email_notifications')} />
        </div>

        <div className="flex items-center justify-between py-2 border-b border-border bg-muted/30 px-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">صوت التنبيه</p>
              <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول إشعار جديد</p>
            </div>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={handleSoundChange} />
        </div>

        {soundEnabled && (
          <>
          <div className="flex items-center justify-between py-2 border-b border-border bg-muted/30 px-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">نغمة التنبيه</p>
            </div>
            <div className="flex items-center gap-2">
              <Select dir="rtl" value={selectedTone} onValueChange={(v) => handleToneChange(v as ToneId)}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => previewTone(selectedTone, VOLUME_OPTIONS.find(v => v.id === volume)?.gain)} aria-label="تشغيل النغمة">
                <Play className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border bg-muted/30 px-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">مستوى الصوت</p>
            </div>
            <Select dir="rtl" value={volume} onValueChange={(v) => handleVolumeChange(v as VolumeLevel)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOLUME_OPTIONS.map(v => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// === Security Tab ===
const SecurityTab = () => {
  const { data: settings, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState('15');

  useEffect(() => {
    if (settings?.idle_timeout_minutes) setIdleMinutes(settings.idle_timeout_minutes);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('app_settings').upsert({ key: 'idle_timeout_minutes', value: idleMinutes, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      toast.success('تم حفظ إعدادات الأمان');
    } catch { toast.error('حدث خطأ أثناء الحفظ'); } finally { setSaving(false); }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">إعدادات الأمان</CardTitle>
        <CardDescription>التحكم بأمان الجلسات وتسجيل الخروج التلقائي</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-border">
          <div>
            <p className="text-sm font-medium">مدة الخمول قبل تسجيل الخروج</p>
            <p className="text-xs text-muted-foreground">يتم تسجيل الخروج تلقائياً بعد هذه المدة من عدم النشاط</p>
          </div>
          <Select value={idleMinutes} onValueChange={setIdleMinutes}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 دقائق</SelectItem>
              <SelectItem value="15">15 دقيقة</SelectItem>
              <SelectItem value="30">30 دقيقة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الأمان'}
        </Button>
      </CardContent>
    </Card>
  );
};

// === Main Settings Page ===
const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-foreground truncate">الإعدادات العامة</h1>
            <p className="text-muted-foreground mt-1 text-sm">إدارة جميع إعدادات النظام من مكان واحد</p>
          </div>
        </div>
        <Tabs defaultValue="waqf" dir="rtl">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="waqf" className="gap-1.5 text-xs md:text-sm">
              <Building2 className="w-4 h-4" />
              بيانات الوقف
            </TabsTrigger>
            <TabsTrigger value="landing" className="gap-1.5 text-xs md:text-sm">
              <Globe className="w-4 h-4" />
              الواجهة الرئيسية
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-1.5 text-xs md:text-sm">
              <LayoutGrid className="w-4 h-4" />
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-1.5 text-xs md:text-sm">
              <LayoutList className="w-4 h-4" />
              القائمة
            </TabsTrigger>
            <TabsTrigger value="beneficiary" className="gap-1.5 text-xs md:text-sm">
              <Users className="w-4 h-4" />
              واجهة المستفيد
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5 text-xs md:text-sm">
              <Palette className="w-4 h-4" />
              المظهر
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="gap-1.5 text-xs md:text-sm">
              <Calendar className="w-4 h-4" />
              السنوات المالية
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs md:text-sm">
              <Bell className="w-4 h-4" />
              الإشعارات
            </TabsTrigger>
            <TabsTrigger value="bulk-notify" className="gap-1.5 text-xs md:text-sm">
              <Megaphone className="w-4 h-4" />
              إشعارات جماعية
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5 text-xs md:text-sm">
              <Download className="w-4 h-4" />
              تصدير البيانات
            </TabsTrigger>
            <TabsTrigger value="banner" className="gap-1.5 text-xs md:text-sm">
              <FlaskConical className="w-4 h-4" />
              شريط التنبيه
            </TabsTrigger>
            <TabsTrigger value="role-permissions" className="gap-1.5 text-xs md:text-sm">
              <Shield className="w-4 h-4" />
              صلاحيات الأدوار
            </TabsTrigger>
            <TabsTrigger value="biometric" className="gap-1.5 text-xs md:text-sm">
              <Fingerprint className="w-4 h-4" />
              البصمة
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs md:text-sm">
              <ShieldCheck className="w-4 h-4" />
              الأمان
            </TabsTrigger>
          </TabsList>
          <TabsContent value="waqf"><WaqfSettingsTab /></TabsContent>
          <TabsContent value="landing"><Suspense fallback={<div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>}><LandingPageTab /></Suspense></TabsContent>
          <TabsContent value="sections"><SectionsTab /></TabsContent>
          <TabsContent value="menu"><Suspense fallback={<div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>}><MenuCustomizationTab /></Suspense></TabsContent>
          <TabsContent value="beneficiary"><BeneficiaryTab /></TabsContent>
          <TabsContent value="appearance"><AppearanceTab /></TabsContent>
          <TabsContent value="fiscal"><Suspense fallback={<div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>}><FiscalYearManagementTab /></Suspense></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="bulk-notify"><Suspense fallback={<div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>}><BulkNotificationsTab /></Suspense></TabsContent>
          <TabsContent value="export"><Suspense fallback={<div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>}><DataExportTab /></Suspense></TabsContent>
          <TabsContent value="banner"><Suspense fallback={<div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>}><BannerSettingsTab /></Suspense></TabsContent>
          <TabsContent value="role-permissions"><Suspense fallback={<div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>}><RolePermissionsTab /></Suspense></TabsContent>
          <TabsContent value="biometric"><Suspense fallback={<div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>}><BiometricSettings /></Suspense></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
