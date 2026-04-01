import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { BENEFICIARY_SECTION_KEYS, pickLabels, makeDefaults } from '@/constants/sections';

const labels = pickLabels(BENEFICIARY_SECTION_KEYS);
const defaultSections = makeDefaults(BENEFICIARY_SECTION_KEYS);

const BeneficiaryTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const sections = getJsonSetting('beneficiary_sections', defaultSections);

  const toggle = (key: string) => {
    updateJsonSetting('beneficiary_sections', { ...sections, [key]: !(sections as Record<string, boolean>)[key] });
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">واجهة المستفيد</CardTitle>
        <CardDescription>التحكم بالأقسام الظاهرة للمستفيدين والواقف</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm font-medium">{label}</span>
            <Switch checked={(sections as Record<string, boolean>)[key] ?? true} onCheckedChange={() => toggle(key)} />
          </div>
        ))}

        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">خيارات إضافية</h4>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium">إظهار مرفقات الفواتير للمستفيدين</span>
            <Switch
              checked={(sections as Record<string, boolean>)['invoice_attachments'] ?? true}
              onCheckedChange={() => toggle('invoice_attachments')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BeneficiaryTab;
