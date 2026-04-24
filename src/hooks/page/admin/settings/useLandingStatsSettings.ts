/**
 * useLandingStatsSettings — page hook لإعدادات إحصائيات صفحة الهبوط
 * يفصل state + load + save + invalidation عن مكون UI
 */
import { useState, useEffect, useCallback } from 'react';
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

export function useLandingStatsSettings() {
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

  const handleChange = useCallback(<K extends keyof StatState>(key: string, field: K, value: StatState[K]) => {
    setForms(prev => {
      const current = prev[key];
      if (!current) return prev;
      return { ...prev, [key]: { ...current, [field]: value } };
    });
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
