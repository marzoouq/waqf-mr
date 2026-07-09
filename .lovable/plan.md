# خطة إصلاح تصميم لوحة الناظر (نسخة موسّعة)

## نتائج الفحص المؤكدة

فحص Playwright على 10 صفحات (viewport 1440×900):

| المسار | ارتفاع الشريط الجانبي | ارتفاع الـ viewport | صحيح؟ |
|---|---|---|---|
| /dashboard | 2976px | 900px | ❌ |
| /dashboard/properties | 1344px | 900px | ❌ |
| /dashboard/contracts | 900px | 900px | ✅ (صدفة — الصفحة قصيرة) |
| /dashboard/income | 1176px | 900px | ❌ |
| /dashboard/beneficiaries | 1255px | 900px | ❌ |
| /dashboard/invoices | 900px | 900px | ✅ (صدفة) |
| /dashboard/reports | 2441px | 900px | ❌ |
| /dashboard/settings | 1562px | 900px | ❌ |
| /dashboard/messages | 924px | 900px | ❌ |
| /dashboard/audit-log | 1605px | 900px | ❌ |

**7 من 10 صفحات مكسورة**. الصفحات "السليمة" سليمة صدفة فقط لأن ارتفاع محتواها ≤ viewport.

## السبب الجذري (مثبت)

في `src/app/root-layout.tsx` سطر 50:

```jsx
<div className="animate-page-in">
  <Outlet />
</div>
```

في `src/index.css` سطر 406-422:

```css
.animate-page-in { animation: pageIn 0.22s cubic-bezier(...) both; }
@keyframes pageIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

بسبب `animation-fill-mode: both`، تبقى `transform: translateY(0)` مطبقة إلى الأبد بعد الحركة. طبقاً لمواصفة CSS، **أي قيمة transform غير `none` تُنشئ containing block جديد** لكل الأحفاد ذوي `position: fixed` — فيتحول `inset-y-0` من "احتلال كامل الـ viewport" إلى "احتلال كامل ارتفاع الحاوية المتحوّلة" (= طول الصفحة كاملاً).

## العناصر المتأثرة

كل العناصر ذات `position: fixed` داخل `DashboardLayout` (شقيقة لـ `Outlet`):

1. `<aside>` الشريط الجانبي (desktop + mobile drawer)
2. `<MobileHeader>` (fixed top)
3. `<BottomNav>` (fixed bottom على الجوال)
4. طبقة `Mobile Sidebar Overlay` (`fixed inset-0`)
5. زر Skip Link (`focus:fixed`)

## التغييرات المطلوبة

### 1. `src/index.css` — تحويل `pageIn` إلى opacity-only (الإصلاح الجوهري)

استبدال keyframes `pageIn` بإزالة `transform` كلياً:

```css
@keyframes pageIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- يبقى الانتقال الناعم بين الصفحات (0.22s fade)
- يزيل containing block الطفيلي → يعود كل `position: fixed` للعمل نسبة للـ viewport
- يحترم `prefers-reduced-motion` كما هو (بلا تغيير)

### 2. `src/constants/navigation.ts` — تنظيف تنسيق مجموعة "الإدارة"

- إضافة مجموعة جديدة `preview` إلى `ADMIN_GROUP_ORDER` (بعد `administration` وقبل `system`)
- إضافتها إلى `ADMIN_GROUP_LABELS` بعنوان `'معاينة'`
- تحديث `ADMIN_ROUTE_GROUPS['/beneficiary']` من `'administration'` إلى `'preview'`

النتيجة: مجموعة "الإدارة" تحتوي فقط أدوات إدارية (المستخدمين + الإعدادات)، و"معاينة بوابة المستفيد" في مجموعة مستقلة صغيرة بعنوان واضح.

### 3. `src/components/layout/sidebar/SidebarNavList.tsx` — تحسين وصولية شارة العدّاد

- إضافة `<span className="sr-only">` قبل الشارة يحتوي فاصل قرائي (مثلاً " — ") لمنع التصاق "المراسلات" بالرقم عند النسخ/screen reader
- أو الأفضل: إبقاء الرقم بصرياً فقط عبر `aria-hidden` كما هو، مع إضافة حاوية `<span className="sr-only">` تحمل النص الكامل "1 رسالة غير مقروءة" وحذف `aria-label` من الشارة (تجنب تكرار الإعلان)

### 4. `src/components/layout/DashboardLayout.tsx` — فحص إضافي (لا تعديل)

الـ `<main>` يستخدم `overflow-y-auto` — يعني التمرير يحدث داخله، والشريط الجانبي `fixed` نسبة للـ viewport (بعد الإصلاح) سيبقى ثابتاً بشكل مثالي.

## خطة التحقق

بعد التنفيذ، إعادة تشغيل نفس سكربت Playwright في `/tmp/browser/deep-audit/` والتأكد من:

- ✅ `asideHeight ≈ 900` على كل الـ 10 مسارات (تسامح ±5px)
- ✅ الشريط الجانبي، MobileHeader، BottomNav ثابتة عند تمرير `<main>`
- ✅ لا كسر في مجموعات القائمة الجانبية (تشغيل `Sidebar.test.tsx` — 7 tests)
- ✅ `Auth.test.tsx` و`AnnualReportPage.test.tsx` وباقي smoke tests تمر
- ✅ فحص بصري للانتقال بين الصفحات — يبقى ناعماً (fade فقط)

## ملاحظات معمارية

- الإصلاح على مستوى النظام لا patch محلي — يستفيد منه أي `position: fixed` مستقبلي داخل الشجرة
- لا حاجة لتغيير أي مكون من الـ 11 مكون المستخدم لـ `fixed`، لأن المشكلة في الأصل (containing block) لا في المستهلكين
- لا تأثير على SEO أو حجم الحزمة (تعديل CSS + ثوابت فقط)
- كل التعديلات محصورة في طبقة العرض (frontend) — لا تمس RLS ولا Edge Functions ولا business logic
