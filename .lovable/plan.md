

# نقل الهوكين إلى management/

## التنفيذ

### 1. نقل الملفين (محتوى مطابق حرفياً)
- `src/hooks/page/admin/useSettingsPage.ts` → `src/hooks/page/admin/management/useSettingsPage.ts`
- `src/hooks/page/admin/useZatcaManagementPage.ts` → `src/hooks/page/admin/management/useZatcaManagementPage.ts`

### 2. تحديث `src/hooks/page/admin/management/index.ts`
إضافة سطرين:
```ts
export * from './useSettingsPage';
export * from './useZatcaManagementPage';
```

### 3. تحديث استيرادين
- `src/pages/dashboard/ZatcaManagementPage.tsx` → المسار الجديد
- `src/pages/dashboard/SettingsPage.tsx` → المسار الجديد

### 4. حذف الملفين القديمين + فحص TypeScript

## الملفات المتأثرة

| ملف | إجراء |
|-----|------|
| `src/hooks/page/admin/management/useSettingsPage.ts` | إنشاء |
| `src/hooks/page/admin/management/useZatcaManagementPage.ts` | إنشاء |
| `src/hooks/page/admin/useSettingsPage.ts` | حذف |
| `src/hooks/page/admin/useZatcaManagementPage.ts` | حذف |
| `src/hooks/page/admin/management/index.ts` | +سطران |
| `src/pages/dashboard/ZatcaManagementPage.tsx` | مسار استيراد |
| `src/pages/dashboard/SettingsPage.tsx` | مسار استيراد |

**صفر تغيير سلوكي. لا مساس بملفات محمية.**

