/**
 * تبويب إعدادات الواجهة الرئيسية — presentational
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Globe } from 'lucide-react';
import LogoUploadCard from './LogoUploadCard';
import LandingStatsSettings from './LandingStatsSettings';
import { useLandingPageTab } from '@/hooks/page/admin/settings/useLandingPageTab';
import type { LandingPageContent } from '@/types/landing';

// إعادة تصدير للتوافق العكسي مع المستوردين القدامى
export type { LandingPageContent };

const LandingPageTab = () => {
  const { form, handleChange, handleSave, landingLogoUrl, isLoading } = useLandingPageTab();

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
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Globe className="w-5 h-5" />
            القسم الرئيسي (Hero)
          </CardTitle>
          <CardDescription>تعديل العنوان والوصف في أعلى الصفحة الرئيسية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-1">العنوان الرئيسي</Label>
            <Input name="hero_title" id="landing-page-tab-field-1" value={form.hero_title} onChange={e => handleChange('hero_title', e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-2">الوصف</Label>
            <Textarea id="landing-page-tab-field-2" value={form.hero_subtitle} onChange={e => handleChange('hero_subtitle', e.target.value)} maxLength={300} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-3">الشعار النصي</Label>
            <Input name="hero_tagline" id="landing-page-tab-field-3" value={form.hero_tagline} onChange={e => handleChange('hero_tagline', e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-4">نص زر الدخول</Label>
            <Input name="cta_text" id="landing-page-tab-field-4" value={form.cta_text} onChange={e => handleChange('cta_text', e.target.value)} maxLength={50} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">قسم المميزات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-5">عنوان القسم</Label>
            <Input name="features_title" id="landing-page-tab-field-5" value={form.features_title} onChange={e => handleChange('features_title', e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-6">وصف القسم</Label>
            <Input name="features_subtitle" id="landing-page-tab-field-6" value={form.features_subtitle} onChange={e => handleChange('features_subtitle', e.target.value)} maxLength={200} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">قسم الدعوة للعمل والتذييل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-7">عنوان الدعوة</Label>
            <Input name="cta_section_title" id="landing-page-tab-field-7" value={form.cta_section_title} onChange={e => handleChange('cta_section_title', e.target.value)} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-8">وصف الدعوة</Label>
            <Input name="cta_section_subtitle" id="landing-page-tab-field-8" value={form.cta_section_subtitle} onChange={e => handleChange('cta_section_subtitle', e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="landing-page-tab-field-9">نص التذييل</Label>
            <Input name="footer_text" id="landing-page-tab-field-9" value={form.footer_text} onChange={e => handleChange('footer_text', e.target.value)} maxLength={200} placeholder="استخدم {year} لإدراج السنة تلقائياً" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="gap-2">
        <Save className="w-4 h-4" />
        حفظ محتوى الواجهة الرئيسية
      </Button>

      <LandingStatsSettings />
    </div>
  );
};

export default LandingPageTab;
