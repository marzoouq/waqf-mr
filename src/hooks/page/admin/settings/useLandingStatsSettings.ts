/**
 * useLandingStatsSettings — page hook لإعدادات إحصائيات صفحة الهبوط
 * يفصل state + load + save + invalidation عن مكون UI
 *
 * نمط الحالة: uncontrolled-with-overrides
 * - `data` من useAppSettings هو مصدر الحقيقة (remote)
 * - `overrides` يخزّن تعديلات المستخدم المحلية فقط حتى الحفظ
 * - `forms` المعروضة = merge(remote, overrides) عبر useMemo
 * - يتجنّب نمط setState داخل useEffect ويمنع cascading renders
 * - يصلح bug خفي: قبل التعديل كان refetch يدوس على تعديلات المستخدم
 */
import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';

export type StatMode = 'auto' | 'manual' | 'hidden';

export interface StatConfig {
  key: 'properties' | 'beneficiaries' | 'fiscal_years';
  defaultLabel: string;
  description: string;
}

export interface StatState {
  mode: StatMode;
  value: string;
  label: string;
}

export const STATS: StatConfig[] = [
  { key: 'properties',    defaultLabel: 'عقار مُدار', description: 'إجمالي العقارات في النظام' },
  { key: 'beneficiaries', defaultLabel: 'مستفيد',     description: 'العدد الفعلي للمستفيدين المسجَّلين' },
  { key: 'fiscal_years',  defaultLabel: 'تقرير سنوي', description: 'عدد التقارير السنوية المنشورة' },
];

type Overrides = Partial<Record<string, Partial<StatState>>>;

export function useLandingStatsSettings() {
  const { data, updateSettingsBatch, isLoading } = useAppSettings();
  const queryClient = useQueryClient();

  // تخزين تعديلات المستخدم المحلية فقط — لا تتأثر بإعادة جلب data
  const [overrides, setOverrides] = useState<Overrides>({});

  // القيم المعروضة = remote (data) ↳ تُغمر بالتعديلات المحلية
  const forms = useMemo<Record<string, StatState>>(() => {
    const merged: Record<string, StatState> = {};
    for (const s of STATS) {
      const remote: StatState = {
        mode: (data?.[`public_stat_${s.key}_mode`] as StatMode) ?? 'auto',
        value: data?.[`public_stat_${s.key}_value`] ?? '',
        label: data?.[`public_stat_${s.key}_label`] ?? '',
      };
      const local = overrides[s.key];
      merged[s.key] = local ? { ...remote, ...local } : remote;
    }
    return merged;
  }, [data, overrides]);

  const handleChange = useCallback(<K extends keyof StatState>(
    key: string,
    field: K,
    value: StatState[K],
  ) => {
    setOverrides(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [field]: value },
    }));
  }, []);

  const handleSave = useCallback(async () => {
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
    // تنظيف التعديلات المحلية بعد نجاح الحفظ — تصبح القيم الجديدة هي remote
    setOverrides({});
  }, [forms, updateSettingsBatch, queryClient]);

  return {
    forms,
    isLoading,
    isPending: updateSettingsBatch.isPending,
    handleChange,
    handleSave,
    stats: STATS,
  };
}
