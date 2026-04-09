

# خطة التنفيذ — الدفعة الأولى (خطوات 2-5, 7-9)

## نظرة عامة

تنفيذ 7 تحسينات معمارية مرتّبة في دفعة واحدة. كل خطوة مستقلة ولا تكسر وظائف قائمة.

---

## الخطوة 1 — استخراج منطق الأعمال من `useAdvanceRequests`

**الهدف**: فصل FSM transitions والإشعارات عن طبقة البيانات.

- إنشاء `src/lib/services/advanceService.ts` يحتوي على:
  - `VALID_TRANSITIONS_TO` (جدول انتقالات الحالة)
  - `buildStatusUpdates(status, rejection_reason)` — بناء كائن التحديث
  - `validateTransition(status)` — التحقق من صحة الانتقال
  - `notifyOnCreate(result, amount)` — إشعار الإنشاء (يستدعي `notifyAdmins` + `notifyUser`)
  - `notifyOnStatusChange(vars)` — إشعار تغيير الحالة
- تعديل `useAdvanceRequests.ts` لاستيراد من `advanceService` بدلاً من تضمين المنطق

**الملفات**: `src/lib/services/advanceService.ts` (جديد)، `src/hooks/data/financial/useAdvanceRequests.ts`

---

## الخطوة 2 — نقل ثوابت التنقل إلى `src/constants/navigation.ts`

**الهدف**: كسر الاعتماد المعكوس (Hook ← Component folder).

- إنشاء `src/constants/navigation.ts` ونقل إليه: `linkLabelKeys`, `allAdminLinks`, `allBeneficiaryLinks`, `SHOW_ALL_ROUTES`, `ADMIN_ROUTE_PERM_KEYS`, `BENEFICIARY_ROUTE_PERM_KEYS`, `ACCOUNTANT_EXCLUDED_ROUTES`, `defaultAdminSections`, `defaultBeneficiarySections`, `ADMIN_SECTION_KEYS`, `BENEFICIARY_SECTION_KEYS`, `ROUTE_TITLES`
- إبقاء re-exports مؤقتة في `components/layout/constants.ts` لمنع كسر أي مستورد غير مكتشف
- تحديث 4 مستوردين مباشرين: `useNavLinks.ts`, `useLayoutState.ts`, `usePermissionCheck.ts`, `MobileHeader.tsx`

**الملفات**: `src/constants/navigation.ts` (جديد)، `src/components/layout/constants.ts`، + 4 ملفات مستوردة

---

## الخطوة 3 — دمج `unreadCount` في `useLayoutState`

**الهدف**: إزالة اقتران `DashboardLayout` بطبقة بيانات المراسلات.

- نقل `useUnreadMessages()` من `DashboardLayout.tsx` إلى `useLayoutState.ts`
- إضافة `unreadCount` إلى القيم المُرجعة من `useLayoutState`
- حذف الاستيراد من `DashboardLayout.tsx`

**الملفات**: `src/hooks/ui/useLayoutState.ts`، `src/components/layout/DashboardLayout.tsx`

---

## الخطوة 4 — توحيد `FALLBACK_LOGO` في Edge Functions

**الهدف**: DRY — مصدر واحد لـ URL الشعار.

- إنشاء `supabase/functions/_shared/constants.ts` مع `FALLBACK_LOGO`
- تحديث 6 ملفات email template لاستيراده بدلاً من تعريفه محلياً
- نشر `auth-email-hook` بعد التعديل

**الملفات**: `supabase/functions/_shared/constants.ts` (جديد)، 6 ملفات في `_shared/email-templates/`

---

## الخطوة 5 — حذف `makeWidgetDefaults` المكررة

**الهدف**: إزالة دالة مكررة.

- حذف `makeWidgetDefaults` من `src/constants/beneficiaryWidgets.ts`
- تحديث المستوردين (ملفين) لاستخدام `makeDefaults(BENEFICIARY_WIDGET_KEYS)` من `@/constants/sections`

**الملفات**: `src/constants/beneficiaryWidgets.ts`، `src/pages/beneficiary/BeneficiaryDashboard.tsx`، `src/components/settings/PermissionsControlPanel.tsx`

---

## الخطوة 6 — JSON-LD ديناميكي في `Index.tsx`

**الهدف**: استبدال الاسم الثابت بقيمة ديناميكية + `useMemo`.

- استبدال `"وقف مرزوق بن علي الثبيتي"` بـ `waqfInfo?.name ?? 'نظام إدارة الوقف'`
- لف `jsonLd` و `webAppJsonLd` بـ `useMemo` مع اعتماد `waqfInfo?.name` و `siteUrl`

**الملفات**: `src/pages/Index.tsx`

---

## الخطوة 7 — حذف تعليق `rebuild:` من `main.tsx`

حذف السطر `// rebuild: 2026-04-03T23:10` من أول الملف.

**الملفات**: `src/main.tsx`

---

## التحقق النهائي

تشغيل `npx tsc --noEmit` للتأكد من خلو المشروع من أخطاء TypeScript بعد جميع التعديلات.

