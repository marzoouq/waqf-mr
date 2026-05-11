import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import LogoUploadCard from '../landing/LogoUploadCard';
import { useWaqfSettingsTab, WAQF_FIELDS, FINANCIAL_FIELDS } from '@/hooks/page/admin/settings/useWaqfSettingsTab';

const WaqfSettingsTab = () => {
  const { formData, onFieldChange, handleSave, saving, isLoading, waqfLogoUrl } = useWaqfSettingsTab();

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <LogoUploadCard
        title="شعار الوقف"
        description="يظهر في لوحة التحكم والقائمة الجانبية ورأس الطباعة"
        settingKey="waqf_logo_url"
        storagePath="logo"
        currentUrl={waqfLogoUrl}
      />
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">بيانات الوقف</CardTitle>
          <CardDescription>معلومات الوقف والصكوك</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {WAQF_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`waqf-settings-tab-field-${f.key}`}>{f.label}</Label>
              <Input name="form_data" id={`waqf-settings-tab-field-${f.key}`} value={formData[f.key] || ''} onChange={(e) => onFieldChange(f.key, e.target.value)} maxLength={500} />
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
          {FINANCIAL_FIELDS.map((f) => {
            const isPercentField = f.key.endsWith('_percentage');
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`waqf-settings-tab-financial-${f.key}`}>{f.label}</Label>
                <Input name="waqf_setting" id={`waqf-settings-tab-financial-${f.key}`}
                  type={isPercentField ? 'number' : 'text'}
                  min={isPercentField ? 0 : undefined}
                  max={isPercentField ? 100 : undefined}
                  step={isPercentField ? '0.1' : undefined}
                  value={formData[f.key] || ''}
                  onChange={(e) => onFieldChange(f.key, e.target.value)}
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

export default WaqfSettingsTab;
