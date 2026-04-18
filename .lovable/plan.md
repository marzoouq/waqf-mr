
## الخطة الجنائية الشاملة — 8 مهام مرتَّبة

أنا حالياً في وضع القراءة فقط. عند موافقتك، سأنتقل إلى وضع التنفيذ وأطبّق المهام بالترتيب 1→8 مع تقرير موجز بعد كل مهمة (ملفات معدَّلة + `tsc` + الاختبارات). إذا فشل اختبار، أتوقف وأبلغك قبل المتابعة.

### المهمة 1 — إصلاح PermissionsControlPanel 🔴
- حذف `defaultAdminSections`/`defaultBeneficiarySections` المحلية
- استيراد من `@/constants/navigation` + استخدام `useSectionsVisibility()`

### المهمة 2 — `useRolePermissions` hook موحَّد
- جديد: `src/hooks/data/settings/useRolePermissions.ts` + test
- يدمج `role_permissions` فوق `DEFAULT_ROLE_PERMS` مع `useMemo`
- تحديث المستهلكين (سأحددهم بـ `code--search_files`)

### المهمة 3 — تفكيك `usePropertiesPage` (244 LOC)
- 3 hooks فرعية في `src/hooks/page/admin/properties/`: filters / form / summary
- `usePropertiesPage` يبقى orchestrator نحيف بنفس public API
- صفر تغيير في `PropertiesPage.tsx`

### المهمة 4 — نقل `useMessagesPage` إلى shared
- النقل + تحديث imports عبر admin/beneficiary

### المهمة 5 — إعادة تجميع مجلدات المستفيد
```
beneficiaries/        → admin/beneficiaries/
beneficiary-dashboard/ → beneficiary/dashboard/
my-share/             → beneficiary/my-share/
disclosure/           → beneficiary/disclosure/
carryforward/         → beneficiary/carryforward/
waqf/                 → waqf-info/
```
imports فقط، صفر منطق. `waqif/` يبقى.

### المهمة 6 — تقسيم 4 components > 200 LOC
- `ZatcaInvoicesTab` → `ZatcaInvoiceRow` + `ZatcaInvoiceFilters`
- `AccountsDistributionTable` → `DistributionRow` + edit dialog
- `UsersTable` → `UserRow` + actions menu
- `OverdueTenantsReport` → `OverdueRow` + summary header

### المهمة 7 — Hooks إعدادات متخصصة
- `useBannerSettings`, `useAppearanceSettings`, `useBeneficiaryWidgets` + tests
- تحديث المستهلكين (سأحددهم بدقة)

### المهمة 8 — مراجعة 8 `eslint-disable`
- تقييم لكل موقع: مشروع/يُصلح/يُوثَّق

---

## الضمانات الجنائية
- صفر تغيير في DB/RLS/Auth/Edge Functions/Migrations
- صفر تغيير في APIs الخارجية ولا تغيير بصري
- لا تُعدَّل: ملفات المصادقة، `components/ui/sidebar.tsx`، الملفات المحمية
- بعد كل مهمة: `tsc --noEmit` + اختبارات ذات صلة
- في النهاية: `npm test` كامل + ملخص شامل
- إعادة استخدام البنية المنشأة في الموجات السابقة (`useSectionsVisibility`, `filterLinksBySectionVisibility`, `isActiveLink`)

## النطاق المتوقع
- **جديد:** ~12 ملف (4 hooks + 3 hooks خصائص + 4 subcomponents + نقل messaging)
- **معدَّل:** ~40-60 ملف (معظمها imports من المهمة 5)
