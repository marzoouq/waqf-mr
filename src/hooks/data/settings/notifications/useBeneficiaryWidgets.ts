/**
 * useBeneficiaryWidgets — hook موحَّد لقراءة إعدادات عناصر لوحة المستفيد
 *
 * يدمج `beneficiary_widgets` من `app_settings` فوق الـ defaults المُولَّدة
 * من `BENEFICIARY_WIDGET_KEYS` (true لكل المفاتيح)، ويُرجِع:
 *  - `widgets`: خريطة `key → boolean` كاملة وثابتة المرجع
 *  - `isVisible(key)`: مساعد للتحقق السريع
 *
 * المستهلكون: `BeneficiaryDashboard`, `PermissionsControlPanel`.
 */
import { useMemo, useCallback } from 'react';
import { useAppSettings } from './useAppSettings';
import { BENEFICIARY_WIDGET_KEYS } from '@/constants/beneficiaryWidgets';
import { makeDefaults } from '@/constants/sections';

export const BENEFICIARY_WIDGETS_KEY = 'beneficiary_widgets';

const DEFAULT_WIDGETS: Record<string, boolean> = makeDefaults(BENEFICIARY_WIDGET_KEYS);

export interface UseBeneficiaryWidgetsResult {
  widgets: Record<string, boolean>;
  isVisible: (key: string) => boolean;
  isLoading: boolean;
}

export const useBeneficiaryWidgets = (): UseBeneficiaryWidgetsResult => {
  const { getJsonSetting, isLoading } = useAppSettings();

  const saved = getJsonSetting<Record<string, boolean>>(BENEFICIARY_WIDGETS_KEY, DEFAULT_WIDGETS);

  // مفتاح JSON يضمن استقرار المرجع طالما المحتوى ثابت
  const savedKey = JSON.stringify(saved);
  const widgets = useMemo<Record<string, boolean>>(
    () => ({ ...DEFAULT_WIDGETS, ...(JSON.parse(savedKey) as Record<string, boolean>) }),
    [savedKey],
  );

  const isVisible = useCallback(
    (key: string) => widgets[key] ?? true,
    [widgets],
  );

  return { widgets, isVisible, isLoading };
};
