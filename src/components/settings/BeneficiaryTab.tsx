import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppSettings } from '@/hooks/useAppSettings';

const BeneficiaryTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const defaultSections = { properties: true, contracts: true, disclosure: true, share: true, accounts: true, reports: true, invoices: true, bylaws: true, messages: true, notifications: true, annual_report: true, support: true };
  const sections = getJsonSetting('beneficiary_sections', defaultSections);

  const labels: Record<string, string> = {
    properties: 'العقارات', contracts: 'العقود', disclosure: 'الإفصاح السنوي', share: 'حصتي من الريع',
    accounts: 'الحسابات الختامية', reports: 'التقارير المالية', invoices: 'الفواتير',
    bylaws: 'اللائحة التنظيمية', messages: 'المراسلات', notifications: 'سجل الإشعارات',
    annual_report: 'التقرير السنوي', support: 'الدعم الفني',
  };

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
      </CardContent>
    </Card>
  );
};

export default BeneficiaryTab;
