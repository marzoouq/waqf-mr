import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Banknote, Save } from 'lucide-react';
import { useAdvanceSettingsTab } from '@/hooks/page/admin/settings/useAdvanceSettingsTab';

const AdvanceSettingsTab = () => {
  const { form, setEnabled, setMinAmount, setMaxPercentage, handleSave, saving, isLoading } = useAdvanceSettingsTab();

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
          <Switch checked={form.enabled} onCheckedChange={setEnabled} />
        </div>

        {/* الحد الأدنى */}
        <div className="space-y-1.5">
          <Label htmlFor="advance-settings-tab-field-1">الحد الأدنى للسلفة (ر.س)</Label>
          <Input name="min_amount" id="advance-settings-tab-field-1"
            type="number"
            min={0}
            value={form.min_amount}
            onChange={(e) => setMinAmount(parseInt(e.target.value) || 0)}
            className="w-48"
            disabled={!form.enabled}
          />
          <p className="text-xs text-muted-foreground">أقل مبلغ يمكن للمستفيد طلبه كسلفة</p>
        </div>

        {/* الحد الأقصى */}
        <div className="space-y-1.5">
          <Label htmlFor="advance-settings-tab-field-2">الحد الأقصى (% من الحصة التقديرية)</Label>
          <Input name="max_percentage" id="advance-settings-tab-field-2"
            type="number"
            min={1}
            max={100}
            value={form.max_percentage}
            onChange={(e) => setMaxPercentage(parseInt(e.target.value) || 50)}
            className="w-48"
            disabled={!form.enabled}
          />
          <p className="text-xs text-muted-foreground">النسبة القصوى من الحصة التقديرية التي يمكن طلبها كسلفة (الافتراضي: 50%)</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ إعدادات السُلف'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdvanceSettingsTab;
