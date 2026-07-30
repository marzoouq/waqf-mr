## نتيجة الفحص

فحصت الأنواع (TypeScript)، ESLint، سلسلة audit، ومجموعة الاختبارات (2190 اختبار).

**الجيد:** فحص الأنواع نظيف تماماً، و2179 اختبار ناجح، وبوابة GAP صفر.

### الأخطاء (يجب إصلاحها)

1. **`MaintenancePage.tsx` — انتهاك حرج (Critical)**
   الصفحة تستدعي `supabase.auth` مباشرة داخل الصفحة. هذا يكسر قاعدة Core Modularization ويوقف بوابة audit (تمنع الـ push). الإصلاح: نقل الاستدعاء إلى `useAuth()` أو hook في `hooks/page/`.

2. **`InteractionsTable.tsx` — خطأ ESLint**
   `setLoading(true)` يُستدعى مباشرة داخل `useEffect` مما يسبب cascading renders. الإصلاح: نقل الجلب إلى TanStack Query أو ضبط الحالة داخل callback.

3. **اختبار مصفوفة صلاحيات الواجهة فاشل**
   مسارات الدعم `/support`, `/support/tickets`, `/support/diagnostics`, `/support/maintenance`, `/support/errors` مضافة في `ROUTE_ROLES` لكنها غير مسجَّلة في `ALL_ROUTES`. الإصلاح: تسجيلها في مصدر المسارات المعتمد.

4. **اختبار `no-forced-reload` فاشل**
   استدعاء `location.reload()` خارج القائمة المسموحة (على الأرجح من كود الصيانة/التشخيص الجديد). الإصلاح: إما استبداله بتنقّل React Router أو إضافته للـ allowlist بمبرر.

5. **اختبار `auditCriticalGate` فاشل** — تبعية مباشرة للبند رقم 1، يُحل معه.

6. **خطأ غير مُلتقط في `InvoicePreviewDialog.test.tsx`**
   `ReferenceError: window is not defined` — setState بعد تفكيك بيئة الاختبار. الإصلاح: إلغاء العملية غير المتزامنة عند unmount.

### تحذيرات (غير حاجزة)

- `fixActions.ts:67` متغير `e` غير مستخدم.
- `useBeneficiaryDashboardPage.ts:36` تعبير `distributions` يُعيد إنشاء تبعيات `useMemo` كل render.
- `ProtectedRouteHelper.tsx` يصدّر غير مكوّنات (يكسر Fast Refresh).
- 4 ألوان hex ثابتة في `SignaturePad.tsx` و`InvoicePreviewDialog.tsx` (مسموحة تقنياً في Canvas/طباعة).
- 6 ملفات في `hooks/data/` تستورد `@/lib/notify` (دَين انتقالي).

### الترتيب المقترح للإصلاح

1. المسارات في `ALL_ROUTES` (يفك اختبارين).
2. `MaintenancePage` supabase → `useAuth` (يفك البوابة الحرجة).
3. `location.reload()` allowlist / استبدال.
4. `InteractionsTable` setState-in-effect.
5. تنظيف التحذيرات الصغيرة.
