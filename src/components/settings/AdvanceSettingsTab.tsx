import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Banknote, Save } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';

const AdvanceSettingsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const defaults = { enabled: true, min_amount: 500, max_percentage: 50 };
  const settings = getJsonSetting('advance_settings', defaults);
  const [form, setForm] = useState(settings);

  useEffect(() => {
    const next = JSON.stringify(settings);
    setForm((prev: typeof settings) => JSON.stringify(prev) === next ? prev : settings);
  }, [settings]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (form.min_amount < 0) return;
    if (form.max_percentage < 1 || form.max_percentage > 100) return;
    setSaving(true);
    try {
      await updateJsonSetting('advance_settings', form);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          إعدادات السُلف
        </CardTitle>
        <CardDescription>التحكم بخيارات طلب السُلف للمستفيدين</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* تفعيل / تعطيل */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium">تفعيل طلبات السُلف</p>
            <p className="text-xs text-muted-foreground">عند التعطيل، لن يتمكن المستفيدون من رؤية أو طلب السُلف</p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm((p: typeof form) => ({ ...p, enabled: v }))}
          />
        </div>

        {/* الحد الأدنى */}
        <div className="space-y-1.5">
          <Label>الحد الأدنى للسلفة (ر.س)</Label>
          <Input
            type="number"
            min={0}
            value={form.min_amount}
            onChange={(e) => setForm((p: typeof form) => ({ ...p, min_amount: parseInt(e.target.value) || 0 }))}
            className="w-48"
            disabled={!form.enabled}
          />
          <p className="text-xs text-muted-foreground">أقل مبلغ يمكن للمستفيد طلبه كسلفة</p>
        </div>

        {/* الحد الأقصى */}
        <div className="space-y-1.5">
          <Label>الحد الأقصى (% من الحصة التقديرية)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={form.max_percentage}
            onChange={(e) => setForm((p: typeof form) => ({ ...p, max_percentage: parseInt(e.target.value) || 50 }))}
            className="w-48"
            disabled={!form.enabled}
          />
          <p className="text-xs text-muted-foreground">النسبة القصوى من الحصة التقديرية التي يمكن طلبها كسلفة (الافتراضي: 50%)</p>
        </div>

        <Button onClick={handleSave} disabled={saving || !form.enabled} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات السُلف'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdvanceSettingsTab;
