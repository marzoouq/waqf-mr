/**
 * LandingStatsSettings — تحكم الناظر في إحصائيات صفحة الهبوط
 *
 * لكل إحصائية (عقارات/مستفيدين/سنوات منشورة):
 *  - وضع العرض: تلقائي (الرقم الحقيقي) | مخصص (رقم يدوي) | مخفي
 *  - تسمية مخصصة (اختيارية — تبقى الافتراضية إن فارغة)
 *  - رقم مخصص (يظهر فقط عند اختيار "مخصص")
 *
 * الحفظ يُنفَّذ دفعة واحدة عبر updateSettingsBatch ثم يُبطل cache `public-stats`.
 */
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, BarChart3, Eye, EyeOff, Pencil, RefreshCw } from 'lucide-react';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';

type StatMode = 'auto' | 'manual' | 'hidden';

interface StatConfig {
  key: 'properties' | 'beneficiaries' | 'fiscal_years';
  defaultLabel: string;
  description: string;
}

const STATS: StatConfig[] = [
  { key: 'properties',    defaultLabel: 'عقار مُدار', description: 'إجمالي العقارات في النظام' },
  { key: 'beneficiaries', defaultLabel: 'مستفيد',     description: 'العدد الفعلي للمستفيدين المسجَّلين' },
  { key: 'fiscal_years',  defaultLabel: 'تقرير سنوي', description: 'عدد التقارير السنوية المنشورة' },
];

interface StatState {
  mode: StatMode;
  value: string;
  label: string;
}

const LandingStatsSettings = () => {
  const { data, updateSettingsBatch, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  const [forms, setForms] = useState<Record<string, StatState>>({});

  // تحميل الإعدادات الحالية من app_settings
  useEffect(() => {
    if (!data) return;
    const next: Record<string, StatState> = {};
    for (const s of STATS) {
      next[s.key] = {
        mode: (data[`public_stat_${s.key}_mode`] as StatMode) ?? 'auto',
        value: data[`public_stat_${s.key}_value`] ?? '',
        label: data[`public_stat_${s.key}_label`] ?? '',
      };
    }
    setForms(next);
  }, [data]);

  const handleChange = <K extends keyof StatState>(key: string, field: K, value: StatState[K]) => {
    setForms(prev => {
      const current = prev[key];
      if (!current) return prev;
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const handleSave = async () => {
    const rows = STATS.flatMap(s => {
      const f = forms[s.key];
      if (!f) return [];
      return [
        { key: `public_stat_${s.key}_mode`,  value: f.mode },
        { key: `public_stat_${s.key}_value`, value: f.value.trim() },
        { key: `public_stat_${s.key}_label`, value: f.label.trim() },
      ];
    });
    await updateSettingsBatch.mutateAsync(rows);
    // إبطال cache الإحصائيات العامة فوراً
    queryClient.invalidateQueries({ queryKey: ['public-stats'] });
  };

  if (isLoading || Object.keys(forms).length === 0) {
    return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          إحصائيات صفحة الهبوط
        </CardTitle>
        <CardDescription>
          تحكم في الأرقام الظاهرة للزوار في القسم الرئيسي للموقع. يمكنك إخفاء أي إحصائية،
          أو إدخال رقم مخصص بدلاً من الرقم الفعلي، أو تغيير تسمية البطاقة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {STATS.map(stat => {
          const f = forms[stat.key];
          if (!f) return null;
          return (
            <div key={stat.key} className="rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-base">{stat.defaultLabel}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                  {stat.key}
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">وضع العرض</Label>
                <RadioGroup
                  value={f.mode}
                  onValueChange={(v) => handleChange(stat.key, 'mode', v as StatMode)}
                  className="grid grid-cols-3 gap-2"
                >
                  <Label
                    htmlFor={`${stat.key}-auto`}
                    className="flex flex-col items-center gap-1 rounded-md border border-border p-2 cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                  >
                    <RadioGroupItem value="auto" id={`${stat.key}-auto`} className="sr-only" />
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-xs">تلقائي</span>
                  </Label>
                  <Label
                    htmlFor={`${stat.key}-manual`}
                    className="flex flex-col items-center gap-1 rounded-md border border-border p-2 cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                  >
                    <RadioGroupItem value="manual" id={`${stat.key}-manual`} className="sr-only" />
                    <Pencil className="w-4 h-4" />
                    <span className="text-xs">مخصص</span>
                  </Label>
                  <Label
                    htmlFor={`${stat.key}-hidden`}
                    className="flex flex-col items-center gap-1 rounded-md border border-border p-2 cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-destructive [&:has([data-state=checked])]:bg-destructive/5"
                  >
                    <RadioGroupItem value="hidden" id={`${stat.key}-hidden`} className="sr-only" />
                    <EyeOff className="w-4 h-4" />
                    <span className="text-xs">إخفاء</span>
                  </Label>
                </RadioGroup>
              </div>

              {f.mode === 'manual' && (
                <div className="space-y-1.5">
                  <Label htmlFor={`${stat.key}-value`} className="text-sm">الرقم المخصص</Label>
                  <Input
                    id={`${stat.key}-value`}
                    name={`${stat.key}_value`}
                    type="text"
                    value={f.value}
                    onChange={(e) => handleChange(stat.key, 'value', e.target.value)}
                    placeholder="مثال: 25 أو +100"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    يُمكن إدخال أرقام أو نصوص قصيرة (مثل: ‎+100‎ أو ‎50K‎).
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor={`${stat.key}-label`} className="text-sm">
                  التسمية الظاهرة <span className="text-muted-foreground">(اختياري)</span>
                </Label>
                <Input
                  id={`${stat.key}-label`}
                  name={`${stat.key}_label`}
                  type="text"
                  value={f.label}
                  onChange={(e) => handleChange(stat.key, 'label', e.target.value)}
                  placeholder={stat.defaultLabel}
                  maxLength={40}
                />
              </div>

              {f.mode !== 'hidden' && (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">معاينة:</span>
                  <span className="font-bold">
                    {f.mode === 'manual' && f.value.trim() ? f.value : '— (الرقم الفعلي)'}
                  </span>
                  <span className="text-muted-foreground">
                    · {f.label.trim() || stat.defaultLabel}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <Button
          onClick={handleSave}
          disabled={updateSettingsBatch.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {updateSettingsBatch.isPending ? 'جارٍ الحفظ...' : 'حفظ إعدادات الإحصائيات'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default LandingStatsSettings;
