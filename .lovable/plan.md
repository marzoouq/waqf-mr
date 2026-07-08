# تقرير التحقق + إغلاق الخطة

## نتيجة التحقق من الكود

الموجات 1-3 **مُنفَّذة فعلياً** في الملفات:

| البند | الملف | الحالة |
|---|---|---|
| `aria-current="page"` | BottomNav, SidebarNavList | ✅ |
| `inert` بدل aria-hidden | DashboardLayout:82 | ✅ |
| `PanelRightOpen/Close` | SidebarBrand:5,39 | ✅ |
| `min-h-11` لمسة 44px | SidebarNavList:41 | ✅ |
| `focus-visible:ring` | Sidebar/BottomNav/Mobile | ✅ |
| توحيد زر الخروج | SidebarUserFooter | ✅ |
| إزالة `willChange` الدائم | Mobile/BottomNav | ✅ |
| إزالة BookOpen المكرّر | Desktop/Mobile headers | ✅ |

ملاحظة: `WaqfInfoBar/FiscalYearSelector/GlobalSearch` تظهر مرتين في DashboardLayout (كتلة `lg:hidden`) وفي DesktopTopBar (`hidden lg:flex`) — لكنها **متعارضة على breakpoints** فلا يوجد ازدواج فعلي في الرندر. مقبول.

## الموجة 4 — الإغلاق

الفحص السابق أظهر أن الـ74 تحذير SECURITY DEFINER معلوماتية والدوال مصممة لـ`authenticated` عمداً. REVOKE جماعي = كسر RLS/RPC.

**الإجراء الوحيد المتبقي (منخفض المخاطر):**

1. توثيق تجاهل `contracts_safe` (Security Definer View — ERROR) عبر `security--manage_security_finding` مع الإشارة إلى `mem://security/views/contracts-safe-rationale`.
2. تحديث `security-memory` (إن لم يكن محدَّثاً) بذكر أن دوال SECURITY DEFINER الحالية موثّقة ومُراجَعة يدوياً.

**بدون:** أي ترحيل SQL، أي REVOKE، أي تعديل كود.

## التسليم

- استدعاء `security--manage_security_finding` (operation=ignore) على finding الخاص بـcontracts_safe.
- استدعاء `security--update_memory` بمحتوى مختصر يوثّق القرار.
- رسالة إغلاق للمستخدم.
