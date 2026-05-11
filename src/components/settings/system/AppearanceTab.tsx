import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import ThemeColorPicker from '@/components/theme/ThemeColorPicker';
import { useAppearanceTab } from '@/hooks/page/admin/settings/useAppearanceTab';

const AppearanceTab = () => {
  const { form, onSystemNameChange, handleSave, isLoading } = useAppearanceTab();

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
            <Label htmlFor="appearance-tab-field-1">اسم النظام</Label>
            <Input name="system_name" id="appearance-tab-field-1" value={form.system_name} onChange={(e) => onSystemNameChange(e.target.value)} maxLength={100} />
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            حفظ الاسم
          </Button>
        </CardContent>
      </Card>
      <ThemeColorPicker />
    </div>
  );
};

export default AppearanceTab;
