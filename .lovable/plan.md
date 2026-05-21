## نتيجة الفحص الجنائي للتقرير

فحصت كل بند فعلياً في الكود ضد ما يدّعيه التقرير. **معظم البنود الحرجة في التقرير غير صحيحة — تم إصلاحها مسبقاً** ولم يُحدَّث التقرير. التفصيل:

### ❌ بنود التقرير غير الصحيحة (ادعاءات خاطئة)

| البند | الادعاء | الواقع في الكود |
|---|---|---|
| 1.1 | تعارض opt-in/opt-out في صلاحيات المحاسب | **غير صحيح**. كلٌّ من `filterLinksByPermissions` (`utils/auth/filterByVisibility.ts:42`) و `usePermissionCheck` (`usePermissionCheck.ts:32`) يستخدمان نفس قاعدة **opt-out**: `!== false`. متّسقان تماماً. |
| 1.2 | `ADMIN_SECTION_KEYS` ينقصه zatca/diagnostics/email_monitor/comparison/settings/users | **غير صحيح**. `sections.ts:36-41` يتضمّن جميع الـ20 مفتاحاً بما فيها الستة المذكورة. |
| 1.3 | InvoicesPage و ExpensesPage يعرضان نفس البيانات | **غير صحيح**. ExpensesPage يستورد `@/components/expenses` + `useExpensesPage` فقط، و InvoicesPage يستورد `@/components/invoices` + `useInvoicesPage` فقط. الفصل محفوظ في الذاكرة `invoices-page-unified-source` ومحمي باختبار `invoicesExpensesDecoupling.test.ts`. |
| 1.4 | لا يوجد `PROTECTED_ADMIN_SECTIONS` يمنع إخفاء settings/users | **غير صحيح**. معرَّف في `sections.ts:47` كـ `['settings', 'users']` + دالة `isProtectedAdminSection` + اختبار `protectedSectionsWriteGuard.test.ts`. |
| 1.5 | `InvoiceSourceFilter` ما زال يستخدم `'expense'` | **غير صحيح**. `types/invoices.ts:72` بالفعل: `'all' \| 'purchase' \| 'rent'`. |
| 5.x | `ACCOUNTANT_EXCLUDED_ROUTES` لا يشمل comparison/email-monitor | **جزئياً**: يشمل `email-monitor` و`diagnostics` و`zatca` و`users` و`settings` (`navigation.ts:167`). لا يشمل `/dashboard/comparison` فقط. |
| 7 | `ADMIN_ROUTES` فيه مسارات بلا `sectionKey` | **غير صحيح**. كل المسارات في `routeRegistry.ts:25-47` لها `sectionKey`. |

### ✅ بنود التقرير الصحيحة فعلاً (الإصلاحات الحقيقية)

1. **`/dashboard/comparison` للمحاسب**: المسار غير مستبعد في `ACCOUNTANT_EXCLUDED_ROUTES`، رغم أنه لوحة تحكم ناظر بحتة (مقارنة تاريخية بين السنوات).
2. **`aria-label` ناقص** على أزرار icon في 4 مواقع (تحقق سطحي مطلوب: `ChatArea.tsx`, `ThemeToggle.tsx`, `NotificationsList.tsx`).

### 🟡 بنود "معمارية" — رأي وليس خطأ
- تجزئة `InvoicesPage.tsx` (179 سطر) أو `useInvoicesPage.ts` (191 سطر): **تحت سقف 200**، لا انتهاك فعلي للقاعدة `container-vs-presentational-boundary`.
- توحيد `useInvoicesPage` (admin) ↔ `useInvoicesViewPage` (beneficiary) في hook مشترك: الفصل الحالي مقصود لأن صلاحيات الكتابة مختلفة. لن أنفّذ هذا دون طلب صريح.

---

## خطة الإصلاح الفعلية (الحقيقي فقط، لا يمسّ مكونات سليمة)

### 1. استبعاد `/dashboard/comparison` للمحاسب
**ملف**: `src/constants/navigation.ts` السطر 167.

```diff
-export const ACCOUNTANT_EXCLUDED_ROUTES = ['/dashboard/users', '/dashboard/settings', '/dashboard/zatca', '/dashboard/diagnostics', '/dashboard/email-monitor', '/beneficiary'];
+export const ACCOUNTANT_EXCLUDED_ROUTES = ['/dashboard/users', '/dashboard/settings', '/dashboard/zatca', '/dashboard/diagnostics', '/dashboard/email-monitor', '/dashboard/comparison', '/beneficiary'];
```

**السبب**: المقارنة التاريخية أداة ناظر استراتيجية، خارج نطاق المحاسب.  
**التأثير**: يختفي الرابط من قائمة المحاسب ويُمنع الوصول المباشر.

### 2. إضافة `aria-label` للأزرار التي تفتقدها
- `src/components/messages/ChatArea.tsx`: زرّا الإرفاق والإرسال.
- `src/components/layout/ThemeToggle.tsx`: زر التبديل.
- `src/components/notifications/NotificationsList.tsx`: زر القائمة/الإجراء.

**السبب**: A11y فقط — لا يغيّر أي سلوك.

### 3. اختبار يحرس استبعاد comparison للمحاسب
إضافة assertion في `src/test/permissionsParity.test.ts` يتأكد أن `isRouteAllowed('/dashboard/comparison')` يُرجع `false` للمحاسب.

---

## ما لن أنفّذه (وأرفض تنفيذه بحجة "التقرير")

- إعادة تسمية `InvoiceSourceFilter` — **مُنجز سلفاً**.
- توسيع `ADMIN_SECTION_KEYS` — **مكتمل سلفاً**.
- إنشاء `PROTECTED_ADMIN_SECTIONS` — **موجود سلفاً**.
- "توحيد" منطق opt-in/opt-out — **لا تعارض أصلاً**.
- فصل InvoicesPage عن ExpensesPage — **منفصلان سلفاً ومحميان باختبارات**.
- تجزئة ملفات تحت سقف 200 سطر بدون ضرورة وظيفية.
- إنشاء `useInvoicesController` مشترك — يخالف فصل صلاحيات الكتابة الحالي.

هل أنفّذ الخطة الثلاثية أعلاه؟