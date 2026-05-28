import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import {
  ADMIN_SECTION_KEYS,
  PROTECTED_ADMIN_SECTIONS,
  isProtectedAdminSection,
  pickLabels,
  makeDefaults,
} from '@/constants/sections';

const labels = pickLabels(ADMIN_SECTION_KEYS);
const defaultSections = makeDefaults(ADMIN_SECTION_KEYS);

const SectionsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();

  const stored = getJsonSetting('sections_visibility', defaultSections) as Record<string, boolean>;
  // الأقسام المحمية تُعرض دائماً كمفعّلة بصرف النظر عن القيمة المخزّنة
  const sections: Record<string, boolean> = { ...stored };
  for (const k of PROTECTED_ADMIN_SECTIONS) sections[k] = true;

  const toggle = (key: string) => {
    if (isProtectedAdminSection(key)) return; // حماية إضافية ضد النقر
    updateJsonSetting('sections_visibility', { ...stored, [key]: !sections[key] });
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">أقسام لوحة التحكم</CardTitle>
          <CardDescription>
            إظهار أو إخفاء أقسام من القائمة الجانبية (يؤثر على الناظر والمحاسب). الأقسام المحمية لا يمكن إخفاؤها لضمان وصول الناظر إلى الإعدادات وإدارة المستخدمين.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(labels).map(([key, label]) => {
            const protectedSec = isProtectedAdminSection(key);
            const row = (
              <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm font-medium flex items-center gap-2">
                  {label}
                  {protectedSec && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="w-3 h-3" /> محمي
                    </Badge>
                  )}
                </span>
                <Switch
                  checked={sections[key] ?? true}
                  onCheckedChange={() => toggle(key)}
                  disabled={protectedSec}
                  aria-label={`إظهار قسم ${label}`}
                />
              </div>
            );
            return protectedSec ? (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div>{row}</div>
                </TooltipTrigger>
                <TooltipContent>قسم محمي — لا يمكن إخفاؤه لضمان استمرارية إدارة النظام</TooltipContent>
              </Tooltip>
            ) : (
              <div key={key}>{row}</div>
            );
          })}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default SectionsTab;
