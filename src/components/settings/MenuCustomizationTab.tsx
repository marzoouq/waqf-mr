/**
 * تبويب تخصيص القائمة الجانبية
 * يتيح للناظر تغيير أسماء عناصر القائمة الجانبية
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, LayoutList, RotateCcw } from 'lucide-react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useState, useEffect } from 'react';

// استيراد مباشر من types/ لمنع الاعتماديات الدائرية
import { defaultMenuLabels, type MenuLabels } from '@/types/navigation';

export type { MenuLabels };
export { defaultMenuLabels };

const MenuCustomizationTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const labels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);
  const [form, setForm] = useState<MenuLabels>(labels);

  // FIX: استقرار المرجع لمنع إعادة الضبط المتكررة
  useEffect(() => {
    const next = JSON.stringify(labels);
    setForm((prev) => JSON.stringify(prev) === next ? prev : labels);
  }, [labels]);

  const handleChange = (key: keyof MenuLabels, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setForm(defaultMenuLabels);
    updateJsonSetting('menu_labels', defaultMenuLabels);
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  const items: { key: keyof MenuLabels; defaultLabel: string }[] = [
    { key: 'home', defaultLabel: 'الرئيسية' },
    { key: 'properties', defaultLabel: 'العقارات' },
    { key: 'contracts', defaultLabel: 'العقود' },
    { key: 'income', defaultLabel: 'الدخل' },
    { key: 'expenses', defaultLabel: 'المصروفات' },
    { key: 'beneficiaries', defaultLabel: 'المستفيدين' },
    { key: 'reports', defaultLabel: 'التقارير' },
    { key: 'accounts', defaultLabel: 'الحسابات' },
    { key: 'users', defaultLabel: 'إدارة المستخدمين' },
    { key: 'settings', defaultLabel: 'الإعدادات' },
    { key: 'messages', defaultLabel: 'المراسلات' },
    { key: 'invoices', defaultLabel: 'الفواتير' },
    { key: 'audit_log', defaultLabel: 'سجل المراجعة' },
    { key: 'bylaws', defaultLabel: 'اللائحة التنظيمية' },
    { key: 'chart_of_accounts', defaultLabel: 'الشجرة المحاسبية' },
    { key: 'beneficiary_view', defaultLabel: 'واجهة المستفيد' },
  ];

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
            {items.map(item => (
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
            <Button onClick={() => updateJsonSetting('menu_labels', form)} className="gap-2">
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
