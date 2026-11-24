/**
 * تبويب إعدادات الواجهة الرئيسية — presentational
 * الناظر يحرر نصوص كل قسم ويتحكم بظهوره.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save, Globe, Eye } from 'lucide-react';
import LogoUploadCard from './LogoUploadCard';
import LandingStatsSettings from './LandingStatsSettings';
import LandingTextField from './LandingTextField';
import { useLandingPageTab } from '@/hooks/page/admin/settings/useLandingPageTab';
import type { LandingPageContent, LandingTextKey, LandingToggleKey } from '@/types/landing';

// إعادة تصدير للتوافق العكسي مع المستوردين القدامى
export type { LandingPageContent };

type FieldDef = { field: LandingTextKey; label: string; max: number; multiline?: boolean; placeholder?: string };

const SECTIONS: { title: string; toggle?: LandingToggleKey; fields: FieldDef[] }[] = [
  { title: 'الواجهة الرئيسية', fields: [
    { field: 'hero_title', label: 'العنوان الرئيسي', max: 100 },
    { field: 'hero_subtitle', label: 'الوصف', max: 300, multiline: true },
    { field: 'hero_tagline', label: 'الشعار النصي', max: 100 },
    { field: 'cta_text', label: 'نص زر الدخول', max: 50 },
  ] },
  { title: 'ميثاق الوقف', toggle: 'show_testament', fields: [
    { field: 'testament_title', label: 'العنوان', max: 100 },
    { field: 'testament_text', label: 'نص الميثاق', max: 800, multiline: true },
  ] },
  { title: 'ركائز الحوكمة', toggle: 'show_pillars', fields: [
    { field: 'features_title', label: 'العنوان', max: 100 },
    { field: 'features_subtitle', label: 'الوصف', max: 200 },
  ] },
  { title: 'التحقق من الوثائق', toggle: 'show_verify', fields: [
    { field: 'verify_title', label: 'العنوان', max: 100 },
    { field: 'verify_subtitle', label: 'الوصف', max: 200 },
  ] },
  { title: 'بوابة الدخول', toggle: 'show_cta', fields: [
    { field: 'cta_section_title', label: 'العنوان', max: 100 },
    { field: 'cta_section_subtitle', label: 'الوصف', max: 200 },
  ] },
  { title: 'التذييل', fields: [
    { field: 'footer_text', label: 'نص التذييل', max: 200, placeholder: 'استخدم {year} لإدراج السنة تلقائياً' },
    { field: 'contact_phone', label: 'جوال ناظر الوقف', max: 20, placeholder: '0500000000' },
  ] },
];

const LandingPageTab = () => {
  const { form, handleChange, handleToggle, handleSave, landingLogoUrl, isLoading } = useLandingPageTab();

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <LogoUploadCard
        title="شعار صفحة الهبوط"
        description="شعار مستقل يظهر في الواجهة الرئيسية فقط. إن لم يُحدد، يُستخدم شعار الوقف."
        settingKey="landing_logo_url"
        storagePath="landing-logo"
        currentUrl={landingLogoUrl}
      />

      {SECTIONS.map(section => (
        <Card key={section.title}>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {section.title}
            </CardTitle>
            {section.toggle && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`toggle-${section.toggle}`} className="text-sm">إظهار للزوار</Label>
                <Switch id={`toggle-${section.toggle}`} checked={form[section.toggle]} onCheckedChange={v => handleToggle(section.toggle!, v)} />
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map(f => (
              <LandingTextField key={f.field} field={f.field} label={f.label} form={form} onChange={handleChange} maxLength={f.max} multiline={f.multiline} placeholder={f.placeholder} />
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="font-display text-lg flex items-center gap-2"><Eye className="w-5 h-5" />أرقام الوقف للزوار</CardTitle>
            <CardDescription className="mt-1">مخفية افتراضياً حفاظاً على خصوصية الوقف ومستحقيه</CardDescription>
          </div>
          <Switch id="toggle-show_stats" aria-label="إظهار أرقام الوقف" checked={form.show_stats} onCheckedChange={v => handleToggle('show_stats', v)} />
        </CardHeader>
      </Card>

      <Button onClick={handleSave} className="gap-2">
        <Save className="w-4 h-4" />
        حفظ محتوى الواجهة الرئيسية
      </Button>

      {form.show_stats && <LandingStatsSettings />}
    </div>
  );
};

export default LandingPageTab;
