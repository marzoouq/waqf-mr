/**
 * هوك مشترك لقراءة إعدادات رؤية الأقسام (sections_visibility, beneficiary_sections)
 * من `app_settings` ودمجها مع القيم الافتراضية.
 *
 * يُستخدم في: BottomNav, useNavLinks, usePermissionCheck لإزالة التكرار
 * وضمان مرجع ثابت بين عمليات الـ render (memoization).
 */
import { useMemo } from 'react';
import { useAppSettings } from './useAppSettings';
import { defaultAdminSections, defaultBeneficiarySections } from '@/constants/navigation';
import { PROTECTED_ADMIN_SECTIONS } from '@/constants/sections';

export function useSectionsVisibility() {
  const { getJsonSetting } = useAppSettings();

  const adminSections = useMemo<Record<string, boolean>>(
    () => {
      const merged = {
        ...defaultAdminSections,
        ...getJsonSetting<Record<string, boolean>>('sections_visibility', {}),
      };
      // إجبار الأقسام المحمية على true دائماً — حتى لو حُدِّثت يدوياً في DB
      for (const key of PROTECTED_ADMIN_SECTIONS) merged[key] = true;
      return merged;
    },
    [getJsonSetting],
  );

  const beneficiarySections = useMemo<Record<string, boolean>>(
    () => ({
      ...defaultBeneficiarySections,
      ...getJsonSetting<Record<string, boolean>>('beneficiary_sections', {}),
    }),
    [getJsonSetting],
  );

  return { adminSections, beneficiarySections };
}
