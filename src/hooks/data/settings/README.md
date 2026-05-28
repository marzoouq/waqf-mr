# `src/hooks/data/settings/` — إعدادات النظام (طبقة بيانات)

استعلامات Supabase لإعدادات التطبيق وتخصيصات الواجهة.

## التنظيم (Sub-folders)

| المجلد | المحتوى |
|--------|---------|
| `app/` | `useAppSettings`, `useAppSettingsRead/Write/History`, `appSettingsUtils` |
| `appearance/` | `useAppearanceSettings`, `useBannerSettings`, `useLogoUpload` |
| `permissions/` | `useRolePermissions`, `useRegistrationEnabled`, `useFeatureVisibility`, `useSectionsVisibility` |
| `waqf/` | `useWaqfInfo`, `useWaqfInfoSave`, `usePdfWaqfInfo` |
| `notifications/` | `useNotificationSettings`, `useBeneficiaryWidgets` |

## القواعد

- `index.ts` يصدّر API عامة موحّدة للمستهلكين الذين يحتاجون عدة hooks معاً.
- المستهلك المفرد يستورد من المسار النهائي مباشرة لتحسين tree-shaking.
- لا `toast` ولا منطق UI — راجع `mem://conventions/no-toast-in-data-hooks`.
