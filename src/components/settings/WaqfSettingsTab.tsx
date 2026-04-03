import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

import { useAppSettings } from '@/hooks/data/settings/useAppSettings';

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
  { key: 'zakat_percentage', label: 'نسبة الزكاة (%)' },
  { key: 'fiscal_year', label: 'السنة المالية' },
];

const WaqfSettingsTab = () => {
  const { data: settings, isLoading, updateSettingsBatch } = useAppSettings();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setFormData({ ...settings });
  }, [settings]);

  // F8: السماح بالقيمة الفارغة (تُعامل كصفر) وتحسين رسالة الخطأ
  const validatePercentage = (key: string, label: string, value: string): boolean => {
    if (!key.endsWith('_percentage')) return true;
    if (key === 'fiscal_year') return true;
    if (value.trim() === '' || value.trim() === '0') return true;
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

      const failedFields: string[] = [];
      const now = new Date().toISOString();
      const rows: { key: string; value: string; updated_at: string }[] = [];
      for (const field of allFields) {
        const value = (formData[field.key] || '').trim();
        if (value.length > 500) { toast.error(`${field.label} طويل جداً`); setSaving(false); return; }
        if (!validatePercentage(field.key, field.label, value)) { setSaving(false); return; }
        rows.push({ key: field.key, value, updated_at: now });
      }
      await updateSettingsBatch.mutateAsync(rows);
      
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
      
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">بيانات الوقف</CardTitle>
          <CardDescription>معلومات الوقف والصكوك</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {waqfFields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`waqf-settings-tab-field-${f.key}`}>{f.label}</Label>
              <Input name="form_data" id={`waqf-settings-tab-field-${f.key}`} value={formData[f.key] || ''} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))} maxLength={500} />
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
                <Label htmlFor={`waqf-settings-tab-financial-${f.key}`}>{f.label}</Label>
                <Input name="waqf_setting" id={`waqf-settings-tab-financial-${f.key}`}
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

export default WaqfSettingsTab;
