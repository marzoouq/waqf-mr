/**
 * useFeatureVisibility — قراءة حالة إظهار/إخفاء ميزة من app_settings
 *
 * يعتمد على نفس استعلام `app-settings-all` المستخدم في useAppSettings
 * فلا يضيف استعلامات إضافية. الافتراضي `visible` للتوافق الخلفي.
 * العناصر ذات `lockable=true` تُرجع دائماً visible حتى لو حُفظت كـ hidden.
 */
import { useMemo } from 'react';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import {
  FEATURE_VISIBILITY_REGISTRY,
  featureVisibilityKey,
  type FeatureScope,
  type FeatureVisibilityEntry,
} from '@/constants/featureVisibilityRegistry';

export type VisibilityValue = 'visible' | 'hidden';

const REGISTRY_INDEX: Map<string, FeatureVisibilityEntry> = new Map(
  FEATURE_VISIBILITY_REGISTRY.map((e) => [featureVisibilityKey(e.scope, e.key), e]),
);

export interface UseFeatureVisibilityResult {
  isVisible: (scope: FeatureScope, key: string) => boolean;
  getValue: (scope: FeatureScope, key: string) => VisibilityValue;
  values: Record<string, VisibilityValue>;
  isLoading: boolean;
}

export const useFeatureVisibility = (): UseFeatureVisibilityResult => {
  const { data, isLoading } = useAppSettings();

  const values = useMemo<Record<string, VisibilityValue>>(() => {
    const out: Record<string, VisibilityValue> = {};
    for (const entry of FEATURE_VISIBILITY_REGISTRY) {
      const fullKey = featureVisibilityKey(entry.scope, entry.key);
      const raw = data?.[fullKey];
      const fallback: VisibilityValue = entry.defaultHidden ? 'hidden' : 'visible';
      if (raw === 'hidden') out[fullKey] = 'hidden';
      else if (raw === 'visible') out[fullKey] = 'visible';
      else out[fullKey] = fallback;
    }
    return out;
  }, [data]);

  const getValue = (scope: FeatureScope, key: string): VisibilityValue => {
    const fullKey = featureVisibilityKey(scope, key);
    const entry = REGISTRY_INDEX.get(fullKey);
    if (entry?.lockable) return 'visible';
    const fallback: VisibilityValue = entry?.defaultHidden ? 'hidden' : 'visible';
    return values[fullKey] ?? fallback;
  };

  const isVisible = (scope: FeatureScope, key: string): boolean =>
    getValue(scope, key) === 'visible';

  return { isVisible, getValue, values, isLoading };
};
