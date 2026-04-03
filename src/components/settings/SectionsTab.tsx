import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { ADMIN_SECTION_KEYS, pickLabels, makeDefaults } from '@/constants/sections';

const labels = pickLabels(ADMIN_SECTION_KEYS);
const defaultSections = makeDefaults(ADMIN_SECTION_KEYS);

const SectionsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const sections = getJsonSetting('sections_visibility', defaultSections);

  const toggle = (key: string) => {
    updateJsonSetting('sections_visibility', { ...sections, [key]: !(sections as Record<string, boolean>)[key] });
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">أقسام لوحة التحكم</CardTitle>
        <CardDescription>إظهار أو إخفاء أقسام من القائمة الجانبية (يؤثر على الناظر والمحاسب)</CardDescription>
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

export default SectionsTab;
