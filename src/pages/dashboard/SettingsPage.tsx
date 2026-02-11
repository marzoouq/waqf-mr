import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Building2, LayoutGrid, Users, Palette, Bell, Save } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useWaqfInfo } from '@/hooks/useWaqfInfo';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const allFields = [...waqfFields, ...financialFields];
      for (const field of allFields) {
        const value = (formData[field.key] || '').trim();
        if (value.length > 500) { toast.error(`${field.label} طويل جداً`); setSaving(false); return; }
        await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', field.key);
      }
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['waqf-info'] });
      toast.success('تم حفظ البيانات بنجاح');
    } catch { toast.error('حدث خطأ أثناء الحفظ'); } finally { setSaving(false); }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
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
          {financialFields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input value={formData[f.key] || ''} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))} maxLength={100} />
            </div>
          ))}
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
  const defaults = { system_name: 'إدارة الوقف', primary_color: '158 64% 25%', secondary_color: '43 74% 49%' };
  const appearance = getJsonSetting('appearance_settings', defaults);
  const [form, setForm] = useState(appearance);

  useEffect(() => { setForm(appearance); }, [isLoading]);

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>اللون الأساسي (HSL)</Label>
            <Input value={form.primary_color} onChange={(e) => setForm((p: typeof form) => ({ ...p, primary_color: e.target.value }))} placeholder="158 64% 25%" />
            <div className="w-full h-8 rounded-md border" style={{ backgroundColor: `hsl(${form.primary_color})` }} />
          </div>
          <div className="space-y-1.5">
            <Label>اللون الثانوي (HSL)</Label>
            <Input value={form.secondary_color} onChange={(e) => setForm((p: typeof form) => ({ ...p, secondary_color: e.target.value }))} placeholder="43 74% 49%" />
            <div className="w-full h-8 rounded-md border" style={{ backgroundColor: `hsl(${form.secondary_color})` }} />
          </div>
        </div>
        <Button onClick={() => updateJsonSetting('appearance_settings', form)} className="gap-2">
          <Save className="w-4 h-4" />
          حفظ المظهر
        </Button>
      </CardContent>
    </Card>
  );
};

// === Notifications Settings Tab ===
const NotificationsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const defaults = { contract_expiry: true, contract_expiry_days: 30, payment_delays: true, email_notifications: false };
  const settings = getJsonSetting('notification_settings', defaults);

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
      </CardContent>
    </Card>
  );
};

// === Main Settings Page ===
const SettingsPage = () => {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">الإعدادات العامة</h1>
          <p className="text-muted-foreground mt-1">إدارة جميع إعدادات النظام من مكان واحد</p>
        </div>
        <Tabs defaultValue="waqf" dir="rtl">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="waqf" className="gap-1.5 text-xs md:text-sm">
              <Building2 className="w-4 h-4" />
              بيانات الوقف
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-1.5 text-xs md:text-sm">
              <LayoutGrid className="w-4 h-4" />
              الأقسام
            </TabsTrigger>
            <TabsTrigger value="beneficiary" className="gap-1.5 text-xs md:text-sm">
              <Users className="w-4 h-4" />
              واجهة المستفيد
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5 text-xs md:text-sm">
              <Palette className="w-4 h-4" />
              المظهر
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs md:text-sm">
              <Bell className="w-4 h-4" />
              الإشعارات
            </TabsTrigger>
          </TabsList>
          <TabsContent value="waqf"><WaqfSettingsTab /></TabsContent>
          <TabsContent value="sections"><SectionsTab /></TabsContent>
          <TabsContent value="beneficiary"><BeneficiaryTab /></TabsContent>
          <TabsContent value="appearance"><AppearanceTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
