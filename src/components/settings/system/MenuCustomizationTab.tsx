/**
 * تبويب تخصيص القائمة الجانبية — presentational
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, LayoutList, RotateCcw } from 'lucide-react';
import { useMenuCustomizationTab, MENU_ITEMS } from '@/hooks/page/admin/settings/useMenuCustomizationTab';

const MenuCustomizationTab = () => {
  const { form, handleChange, handleSave, handleReset, isLoading } = useMenuCustomizationTab();

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <LayoutList className="w-5 h-5" />
            تخصيص أسماء القائمة الجانبية
          </CardTitle>
          <CardDescription>تغيير مسميات عناصر القائمة الجانبية حسب رغبتك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MENU_ITEMS.map(item => (
              <div key={item.key} className="space-y-1">
                <Label htmlFor={`menu-label-${item.key}`} className="text-xs text-muted-foreground">{item.defaultLabel}</Label>
                <Input name="menu_label" id={`menu-label-${item.key}`}
                  value={form[item.key]}
                  onChange={e => handleChange(item.key, e.target.value)}
                  maxLength={30}
                  placeholder={item.defaultLabel}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              حفظ المسميات
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              استعادة الافتراضي
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuCustomizationTab;
