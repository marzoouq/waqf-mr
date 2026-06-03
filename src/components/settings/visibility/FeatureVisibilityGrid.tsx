/**
 * FeatureVisibilityGrid — شبكة تحكم الناظر بإظهار/إخفاء ميزات الواجهة.
 *
 * طبقة عرض بحتة: تحفظ القيم في app_settings تحت `feature_visibility.<scope>.<key>`.
 * الافتراضي visible. عناصر lockable لا يمكن إخفاؤها.
 *
 * الحفظ على دفعة واحدة (diff فقط) عبر updateSettingsBatch.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Search, Eye, EyeOff } from 'lucide-react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { useFeatureVisibility, type VisibilityValue } from '@/hooks/data/settings/permissions/useFeatureVisibility';
import {
  FEATURE_REGISTRY_BY_SCOPE,
  FEATURE_SCOPE_LABELS,
  featureVisibilityKey,
  type FeatureScope,
} from '@/constants/featureVisibilityRegistry';
import FeatureVisibilityGridRow from './FeatureVisibilityGridRow';
import { uiNotify } from '@/lib/notify';

const SCOPES: FeatureScope[] = ['beneficiary', 'waqif', 'accountant'];

const FeatureVisibilityGrid = () => {
  const { getValue, isLoading } = useFeatureVisibility();
  const { updateSettingsBatch } = useAppSettings();
  const [overrides, setOverrides] = useState<Record<string, VisibilityValue>>({});
  const [search, setSearch] = useState('');
  const [activeScope, setActiveScope] = useState<FeatureScope>('beneficiary');

  const dirtyCount = Object.keys(overrides).length;

  const setLocal = (scope: FeatureScope, key: string, next: VisibilityValue) => {
    const fullKey = featureVisibilityKey(scope, key);
    const current = getValue(scope, key);
    setOverrides((prev) => {
      const copy = { ...prev };
      if (next === current) delete copy[fullKey];
      else copy[fullKey] = next;
      return copy;
    });
  };

  const handleSave = async () => {
    if (dirtyCount === 0) return;
    const rows = Object.entries(overrides).map(([key, value]) => ({ key, value }));
    try {
      await updateSettingsBatch.mutateAsync(rows);
      setOverrides({});
      uiNotify.success(`تم حفظ ${rows.length} تغيير`);
    } catch {
      // useMutation onError يعرض الخطأ
    }
  };

  const handleReset = () => setOverrides({});

  const filteredByScope = useMemo(() => {
    const q = search.trim();
    const out: Record<FeatureScope, ReturnType<() => typeof FEATURE_REGISTRY_BY_SCOPE[FeatureScope]>> = {
      beneficiary: [], waqif: [], accountant: [],
    };
    for (const scope of SCOPES) {
      const entries = FEATURE_REGISTRY_BY_SCOPE[scope];
      out[scope] = q
        ? entries.filter((e) => e.label.includes(q) || (e.description?.includes(q) ?? false))
        : entries;
    }
    return out;
  }, [search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />إظهار / إخفاء ميزات الواجهة
        </CardTitle>
        <CardDescription>
          تحكّم بما يراه المستفيد والواقف والمحاسب في لوحاتهم. هذه طبقة عرض فقط ولا تستبدل صلاحيات الأمان.
          العناصر المُعلَّمة بـ "إلزامي" لا يمكن إخفاؤها لأسباب تنظيمية.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              dir="rtl"
              placeholder="ابحث في الميزات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={dirtyCount === 0 || updateSettingsBatch.isPending}
            >
              <EyeOff className="w-4 h-4 ml-1" />تجاهل التغييرات
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={dirtyCount === 0 || updateSettingsBatch.isPending || isLoading}
            >
              <Save className="w-4 h-4 ml-1" />
              حفظ {dirtyCount > 0 ? `(${dirtyCount})` : ''}
            </Button>
          </div>
        </div>

        <Tabs value={activeScope} onValueChange={(v) => setActiveScope(v as FeatureScope)} dir="rtl">
          <TabsList aria-label="فئات الميزات" className="w-full grid grid-cols-3">
            {SCOPES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {FEATURE_SCOPE_LABELS[s]}
                <span className="mr-1.5 text-xs text-muted-foreground">
                  ({filteredByScope[s].length})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {SCOPES.map((scope) => (
            <TabsContent key={scope} value={scope} className="space-y-2 mt-4">
              {filteredByScope[scope].length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  لا توجد ميزات مطابقة.
                </p>
              ) : (
                filteredByScope[scope].map((entry) => {
                  const fullKey = featureVisibilityKey(scope, entry.key);
                  const local = overrides[fullKey] ?? getValue(scope, entry.key);
                  return (
                    <FeatureVisibilityGridRow
                      key={fullKey}
                      entry={entry}
                      value={local}
                      onChange={(next) => setLocal(scope, entry.key, next)}
                      disabled={updateSettingsBatch.isPending}
                    />
                  );
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FeatureVisibilityGrid;
