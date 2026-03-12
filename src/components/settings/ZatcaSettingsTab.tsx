import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, FileText, Cpu } from 'lucide-react';
import { toast } from 'sonner';

const ZATCA_KEYS = [
  'vat_registration_number',
  'commercial_registration_number',
  'business_address_street',
  'business_address_city',
  'business_address_postal_code',
  'business_address_district',
  'default_vat_rate',
  'zatca_device_serial',
] as const;

const DEVICE_SERIAL_REGEX = /^1-.+\|2-.+\|3-.+$/;

const ZatcaSettingsTab = () => {
  const { data: settings, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = {};
      for (const key of ZATCA_KEYS) {
        initial[key] = settings[key] || '';
      }
      setFormData(initial);
    }
  }, [settings]);

  const handleSave = async () => {
    // Validate VAT number format (15 digits, starts and ends with 3)
    const vatNum = formData.vat_registration_number?.trim();
    if (vatNum && vatNum.length > 0) {
      if (!/^\d{15}$/.test(vatNum)) {
        toast.error('الرقم الضريبي يجب أن يكون 15 رقماً');
        return;
      }
      if (!vatNum.startsWith('3') || !vatNum.endsWith('3')) {
        toast.error('الرقم الضريبي يجب أن يبدأ وينتهي بالرقم 3');
        return;
      }
    }

    // Validate device serial format
    const serial = formData.zatca_device_serial?.trim();
    if (serial && serial.length > 0 && !DEVICE_SERIAL_REGEX.test(serial)) {
      toast.error('صيغة معرّف الجهاز غير صحيحة. الصيغة المطلوبة: 1-XXX|2-YYY|3-ZZZ');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const rows = ZATCA_KEYS.map((key) => ({
        key,
        value: (formData[key] || '').trim(),
        updated_at: now,
      }));
      const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
      queryClient.invalidateQueries({ queryKey: ['waqf-info'] });
      toast.success('تم حفظ إعدادات الضريبة بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            بيانات التسجيل الضريبي
          </CardTitle>
          <CardDescription>
            بيانات ZATCA المطلوبة لإصدار الفواتير الإلكترونية المتوافقة
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>الرقم الضريبي (TIN)</Label>
            <Input
              value={formData.vat_registration_number || ''}
              onChange={(e) => setFormData((p) => ({ ...p, vat_registration_number: e.target.value }))}
              placeholder="3XXXXXXXXXX0003"
              maxLength={15}
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">15 رقماً — يبدأ وينتهي بـ 3</p>
          </div>
          <div className="space-y-1.5">
            <Label>السجل التجاري</Label>
            <Input
              value={formData.commercial_registration_number || ''}
              onChange={(e) => setFormData((p) => ({ ...p, commercial_registration_number: e.target.value }))}
              placeholder="رقم السجل التجاري"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">عنوان المنشأة</CardTitle>
          <CardDescription>العنوان المطلوب في الفواتير الضريبية</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>الشارع</Label>
            <Input
              value={formData.business_address_street || ''}
              onChange={(e) => setFormData((p) => ({ ...p, business_address_street: e.target.value }))}
              placeholder="اسم الشارع"
            />
          </div>
          <div className="space-y-1.5">
            <Label>الحي</Label>
            <Input
              value={formData.business_address_district || ''}
              onChange={(e) => setFormData((p) => ({ ...p, business_address_district: e.target.value }))}
              placeholder="اسم الحي"
            />
          </div>
          <div className="space-y-1.5">
            <Label>المدينة</Label>
            <Input
              value={formData.business_address_city || ''}
              onChange={(e) => setFormData((p) => ({ ...p, business_address_city: e.target.value }))}
              placeholder="المدينة"
            />
          </div>
          <div className="space-y-1.5">
            <Label>الرمز البريدي</Label>
            <Input
              value={formData.business_address_postal_code || ''}
              onChange={(e) => setFormData((p) => ({ ...p, business_address_postal_code: e.target.value }))}
              placeholder="الرمز البريدي"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">إعدادات الضريبة</CardTitle>
          <CardDescription>نسبة ضريبة القيمة المضافة الافتراضية على الفواتير الجديدة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-w-xs">
            <Label>نسبة VAT الافتراضية</Label>
            <Select
              value={formData.default_vat_rate || '0'}
              onValueChange={(value) => setFormData((p) => ({ ...p, default_vat_rate: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% — معفاة</SelectItem>
                <SelectItem value="15">15% — خاضعة</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              الأوقاف السكنية عادةً معفاة (0%)، التجارية خاضعة (15%)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            معرّف الجهاز (Device Serial)
          </CardTitle>
          <CardDescription>
            معرّف فريد للحل التقني يُستخدم عند تسجيل الشهادة مع ZATCA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-w-md">
            <Label>معرّف الجهاز</Label>
            <Input
              value={formData.zatca_device_serial || ''}
              onChange={(e) => setFormData((p) => ({ ...p, zatca_device_serial: e.target.value }))}
              placeholder="1-WAQF|2-POS01|3-SN001"
              dir="ltr"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              الصيغة المطلوبة: <code className="bg-muted px-1 rounded">1-اسم_المزود|2-الموديل|3-الرقم_التسلسلي</code>
            </p>
            {formData.zatca_device_serial && !DEVICE_SERIAL_REGEX.test(formData.zatca_device_serial.trim()) && (
              <p className="text-xs text-destructive">⚠️ الصيغة غير صحيحة — يجب أن تتبع النمط: 1-XXX|2-YYY|3-ZZZ</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الضريبة'}
      </Button>
    </div>
  );
};

export default ZatcaSettingsTab;
