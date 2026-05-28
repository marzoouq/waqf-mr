# خطة إصلاح موجة Critical — 7 مشاكل مؤكدة بالفحص الجنائي

ادعاءات التقرير الخارجي تم فلترتها: 7 صحيحة فعلياً، الباقي إما UX أو ادعاءات كاذبة (خاصة بند `.env` الحرج المزعوم — المحتوى مفاتيح publishable و`.env` في `.gitignore` أصلاً).

---

## 1. تسرّب `/dashboard/comparison` لـ QuickActions المحاسب

**المشكلة:**
`src/constants/quickActions.ts:24` يضع `/dashboard/comparison` ضمن `accountant`، بينما `adminRoutes.tsx:50` يحمي المسار بـ`ADMIN_ONLY`، و`navigation.ts:172` يضعه في `ACCOUNTANT_EXCLUDED_ROUTES`. المحاسب يضغط الزر → صفحة محجوبة.

**الحل:**
- إزالة سطر `comparison` من `QUICK_ACTIONS.accountant` في `quickActions.ts`.
- تحصين دفاعي في `QuickActionsCard.tsx`: استيراد `ACCOUNTANT_EXCLUDED_ROUTES` وفلترة `actions` بحيث لا يظهر أي action مسارُه ضمن قائمة الاستثناء عندما `role==='accountant'`.
- اختبار جديد `src/test/quickActionsExclusion.test.ts` يفشل إذا ظهر مسار محجوب في QuickActions.

---

## 2. حساب العجز يخفي حالة "إنفاق بلا دخل"

**المشكلة:**
في `useAdminDashboardStats.ts:117` و`useAdminDashboardData.ts:74`:
```ts
expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;
```
عند `income=0 && expenses>0` تكون النسبة 0 ولا يتحقق شرط `expenseRatio > 100` في `DashboardAlerts.tsx:25`، فتختفي حالة عجز حقيقية.

**الحل:**
استخراج دالة نقية `computeExpenseRatio(income, expenses)` في `src/utils/financial/ratios.ts`:
```ts
if (income <= 0 && expenses > 0) return 999; // sentinel = deficit
if (income <= 0) return 0;
return Math.round((expenses / income) * 100);
```
استخدامها في الموضعين. عرض النص الموحّد في `DashboardAlerts` و KPI:
- `ratio === 999` → "عجز كامل: إنفاق بدون دخل" بدل "تجاوز X%".
- `ratio > 100` → السلوك الحالي.

اختبار وحدة للدالة بالحالات الثلاث.

---

## 3. زر تنبيه "معدل التحصيل منخفض" يوجّه للعقود

**المشكلة:**
`DashboardAlerts.tsx` نص التنبيه عن "الفواتير المتأخرة" لكن الزر `Link to="/dashboard/contracts"`.

**الحل:**
تغيير الوجهة إلى `/dashboard/invoices` ونص الزر إلى "مراجعة الفواتير المتأخرة". (تعديل سطرين فقط في `DashboardAlerts.tsx`.)

---

## 4. SidebarNavList المطوي بلا اسم accessible

**المشكلة:**
`SidebarNavList.tsx:31-49` عند الطي: النص `lg:hidden`، الأيقونة `aria-hidden`، الرابط بلا `aria-label`. Tooltip لا يُحسب accessible name. → روابط مجهولة لقارئ الشاشة.

**الحل:**
إضافة `aria-label={link.label}` على كل `<Link>` بشكل دائم (لا يضر عند الفتح لأن النص المرئي يبقى المرجع البصري). تعديل سطر واحد.

---

## 5. ResponsiveTabs بـ id ثابت وبلا label

**المشكلة:**
`responsive-tabs.tsx:61` `id="responsive-tabs-select-1"` → IDs مكررة عند استخدام المكوّن مرتين. كذلك `NativeSelect` بلا `aria-label`.

**الحل:**
- `const reactId = React.useId();` واستخدام ``id={`responsive-tabs-select-${reactId}`}``.
- إضافة prop اختيارية `ariaLabel?: string` تُمرَّر إلى `NativeSelect`، مع fallback "اختر القسم".

---

## 6. Mobile Sidebar بدون dialog semantics ولا focus trap

**المشكلة:**
`DashboardLayout.tsx:63-77` mobile `<aside>` يفتح كـdrawer لكن بدون `role="dialog"`/`aria-modal`/focus trap → خروج التركيز خلف القائمة، قارئ الشاشة لا يعلم بفتح واجهة.

**الحل (محدود الأثر):**
على عنصر `<aside>` المخصص للموبايل فقط:
- إضافة `role="dialog"` و`aria-modal="true"`.
- إضافة `aria-hidden={!mobileSidebarOpen}` ووسم `tabIndex={-1}` مع `inert` (عبر className condition) عند الإغلاق.
- إضافة `aria-hidden="true"` على overlay div.
- focus trap بسيط: عند فتح القائمة، نقل التركيز لأول عنصر تفاعلي داخلها (`useEffect` يستهدف ref)، وعند الإغلاق إعادة التركيز لزر hamburger. (لا حاجة لمكتبة — حلقة Tab تُعالَج بـonKeyDown داخل `<aside>`.)
- استخدام Escape للإغلاق.

لا تغيير على البنية البصرية ولا استبدال للمكوّن.

---

## 7. SettingsPage mobile Select غير دلالي

**المشكلة:**
`SettingsPage.tsx:38-50`:
- `<div>` خام داخل `<SelectContent>` بدل `<SelectGroup>/<SelectLabel>`.
- `Select` بلا label/`aria-label`.
- على سطح المكتب: عدة `TabsList` داخل نفس `Tabs` — مقبول لكن `TabsList` بحاجة `aria-label="<group>"`.

**الحل:**
- استبدال `<div>` بـ`<SelectGroup>` و`<div className="...">` بـ`<SelectLabel>` لكل فئة.
- إضافة `aria-label="اختر قسم الإعدادات"` على `<SelectTrigger>`.
- إضافة `aria-label={cat.label}` على كل `<TabsList>`.

---

## ملفات ستُعدَّل

```
src/constants/quickActions.ts                          (إزالة سطر)
src/components/dashboard/widgets/QuickActionsCard.tsx  (فلترة دفاعية)
src/utils/financial/ratios.ts                          (جديد — دالة نقية)
src/hooks/page/admin/dashboard/useAdminDashboardStats.ts
src/hooks/page/admin/dashboard/useAdminDashboardData.ts
src/components/dashboard/widgets/DashboardAlerts.tsx   (نص + رابط + عجز كامل)
src/components/layout/sidebar/SidebarNavList.tsx       (aria-label)
src/components/ui/responsive-tabs.tsx                  (useId + ariaLabel)
src/components/layout/DashboardLayout.tsx              (dialog + focus trap mobile)
src/pages/dashboard/SettingsPage.tsx                   (SelectGroup/Label + aria)
```

## ملفات جديدة (اختبارات)

```
src/utils/financial/ratios.test.ts
src/test/quickActionsExclusion.test.ts
```

## خارج النطاق (مرفوض كادعاء كاذب)

- **بند 43 (.env "حرج"):** لا تغيير — `.env` في `.gitignore` (سطر 27)، والمحتوى مفاتيح Supabase publishable علنية بطبيعتها.

## خارج النطاق (UX/قاعدة عمل، يحتاج قراراً منفصلاً)

- BottomNav بدون رسائل للناظر/المحاسب (بند 26-27).
- routeRegistry تكرار مع navigation (بند 5).
- `distributions` يستخدم `permKey:'accounts'` (بند 3-4).
- صلاحيات المحاسب على audit-log/bylaws/support (بند 38-42).

## التحقق بعد التنفيذ

- `tsc --noEmit` نظيف.
- `bunx vitest run` على الاختبارات الجديدة.
- فحص يدوي: تسجيل دخول كمحاسب → عدم ظهور زر "المقارنة التاريخية"؛ فتح Sidebar موبايل بلوحة المفاتيح والتأكد من Escape و focus trap.
