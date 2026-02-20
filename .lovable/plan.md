
# تقرير الفحص الجنائي الشامل -- الجولة 13

## التقييم العام: 9.7/10

---

## 1. الأمان وقاعدة البيانات

### RLS (سياسات أمان الصفوف)
- **19 جدولاً** جميعها مفعّل عليها RLS بدون استثناء
- لا توجد سياسات `USING(true)` مفتوحة على الجداول الحساسة
- جدول `audit_log` و `access_log` محميان من التعديل والحذف بسياسات `USING(false)`
- سياسة `anon` لـ `app_settings` مقيدة بمفتاح `registration_enabled` فقط

### المشغلات (Triggers)
- **25 مشغلاً نشطاً** (جميعها `tgenabled = O` = مفعّلة)
- 10 مشغلات تدقيق (`audit_*`) تغطي: accounts, beneficiaries, contracts, distributions, expenses, fiscal_years, income, invoices, properties, units, waqf_bylaws
- 4 مشغلات حماية السنوات المقفلة (`prevent_closed_fy_*`) تغطي: contracts, expenses, income, invoices
- 10 مشغلات تحديث `updated_at` تلقائياً

### وظائف الحافة (Edge Functions)
- 7 وظائف مؤمنة: `admin-manage-users`, `ai-assistant`, `auto-expire-contracts`, `check-contract-expiry`, `generate-invoice-pdf`, `guard-signup`, `lookup-national-id`
- جميعها تتحقق من `service_role` أو دور `admin` في قاعدة البيانات
- `lookup-national-id` محمية من هجمات التعداد (Rate Limit + تأخير ثابت 300ms + استجابة موحدة 200)
- `guard-signup` تفرض التحقق من `registration_enabled` على مستوى الخادم

### CORS
- ملف `_shared/cors.ts` يحتوي على دالة `getCorsHeaders()` ديناميكية مع قائمة بيضاء
- لكن **ملاحظة**: `corsHeaders` الثابت (سطر 24) ما زال يستخدم `"*"` وهو مستخدم في `check-contract-expiry` و `guard-signup` و `admin-manage-users` -- هذا ليس ثغرة حرجة لأن التحقق من المصادقة يتم داخل الوظائف، لكنه يمثل عدم اتساق

### نتائج فحص الأمان
| النتيجة | المستوى | الحالة |
|---------|---------|--------|
| حماية كلمات المرور المسربة (HIBP) معطلة | تحذير | يتطلب تفعيل يدوي من لوحة التحكم |
| Extension في schema عام | تحذير | مخاطر منخفضة |
| كشف بيانات المستفيدين | خطأ | **مشكلة قائمة** - سيتم توضيحها أدناه |

---

## 2. المشكلات المكتشفة

### مشكلة 1: كشف بيانات المستفيدين (خطورة متوسطة)
**الوصف**: هوك `useBeneficiaries()` في `AccountsPage.tsx` يستعلم من جدول `beneficiaries` مباشرة (وليس `beneficiaries_safe`). هذا يعني أن الناظر (admin) يحصل على البيانات الكاملة وهذا مقصود ومطلوب، لكن يجب التأكد أن واجهات المستفيدين لا تستعلم من الجدول الأصلي.

**الحالة**: `useFinancialSummary` يستخدم `useBeneficiariesSafe()` وهذا صحيح. `AccountsPage` يستخدم `useBeneficiaries()` وهو صحيح لأنه صفحة ناظر فقط محمية بـ `ProtectedRoute allowedRoles={['admin']}`.

**الخلاصة**: ليست ثغرة فعلية -- استخدام مقصود ومحمي بطبقتين (Route + RLS).

### مشكلة 2: CORS غير متسق في Edge Functions (خطورة منخفضة)
**الوصف**: بعض الوظائف تستخدم `corsHeaders` الثابت (`*`) بدلاً من `getCorsHeaders(req)` الديناميكي.

**الملفات المتأثرة**:
- `check-contract-expiry/index.ts` (سطر 7)
- `admin-manage-users/index.ts` (سطر 11)
- `guard-signup/index.ts` (سطر 8)

**التأثير**: ضئيل لأن التحقق من المصادقة يتم داخلياً، لكنه يخالف مبدأ الدفاع العميق.

**الإصلاح المقترح**: استبدال `corsHeaders` بـ `getCorsHeaders(req)` في الوظائف الثلاث.

### مشكلة 3: عدم وجود صفحة إعادة تعيين كلمة المرور (خطورة متوسطة)
**الوصف**: في `Auth.tsx` سطر 345، رابط إعادة التعيين يوجه إلى `${window.location.origin}/auth` وليس لصفحة `/reset-password` مخصصة. هذا يعني أن المستخدم سيُسجل دخوله تلقائياً عند النقر على رابط إعادة التعيين بدون فرصة لتغيير كلمة المرور فعلياً.

**الإصلاح المطلوب**: إنشاء صفحة `/reset-password` تتحقق من `type=recovery` وتعرض نموذج تغيير كلمة المرور.

### مشكلة 4: `handleSignIn` لا يمنع الإرسال عند `return` المبكر (خطورة منخفضة)
**الوصف**: في `Auth.tsx` سطور 118-141، عند فشل التحقق (مثل عدم إدخال البريد)، يتم `return` بدون `setIsLoading(false)`. وبالرغم من وجود `finally`، الـ `return` يقع داخل `try` فيعمل `finally` بشكل صحيح.

**الحالة**: لا توجد مشكلة -- `finally` يغطي جميع الحالات.

---

## 3. البنية التحتية والأداء

### نمط المعمارة
- **CRUD Factory** (`createCrudFactory`): نمط موحد يغطي جميع الجداول الرئيسية مع حد 500 سجل
- **React Query**: `staleTime: 5 دقائق`, `retry: 1`, `refetchOnWindowFocus: false` -- إعدادات مناسبة
- **Lazy Loading**: جميع الصفحات محملة بشكل كسول مع `Suspense`
- **Error Boundary**: يغلف التطبيق بالكامل

### التحقق من المنطق المالي
```
shareBase = totalIncome - totalExpenses - zakatAmount
```
- يتم استبعاد: الرصيد المرحل (`waqfCorpusPrevious`) والضريبة (`manualVat`) من أساس الحساب
- `adminShare = shareBase * adminPercent / 100`
- `waqifShare = shareBase * waqifPercent / 100`
- `waqfRevenue = netAfterZakat - adminShare - waqifShare`

**التحقق**: المنطق في `accountsCalculations.ts` و `useFinancialSummary.ts` و `AccountsPage.tsx` **متطابق ومتسق** تماماً.

### إقفال السنة المالية
تم التحقق من الخطوات الست (A-F):
- A: حفظ لقطة ختامية -- نعم
- B: تغيير الحالة لـ `closed` -- نعم
- C: إنشاء سنة جديدة مع فحص التكرار -- نعم
- D: ترحيل `waqfCorpusManual` كـ `waqf_corpus_previous` -- نعم
- E: تحديث الكاش -- نعم
- F: إشعار المستفيدين -- نعم

### التوجيه والحماية
- جميع مسارات `/dashboard/*` محمية بـ `allowedRoles={['admin']}`
- جميع مسارات `/beneficiary/*` محمية بـ `allowedRoles={['admin', 'beneficiary', 'waqif']}`
- `ProtectedRoute` يعالج حالة "مستخدم بدون دور" كحالة تحميل (وليس رفض)
- `FiscalYearContext` يتحقق من صلاحية الاختيار المخزن في `localStorage`

### CSP (سياسة أمن المحتوى)
- محددة في `index.html` بشكل صارم
- `unsafe-eval` **غير موجود** في `script-src`
- `blob:` مسموح في `frame-src` لعارض الفواتير
- `object-src: 'none'` -- جيد

### إدارة الجلسات
- مؤقت خمول قابل للتخصيص (افتراضي 15 دقيقة)
- تحذير قبل دقيقة مع خيار البقاء
- تسجيل خروج تلقائي مع إعادة توجيه وتسجيل الحدث

---

## 4. ملخص المشكلات والتوصيات

| # | المشكلة | الخطورة | الحالة |
|---|---------|---------|--------|
| 1 | عدم وجود صفحة `/reset-password` | متوسطة | **يتطلب إصلاح** |
| 2 | CORS غير متسق في 3 Edge Functions | منخفضة | يُنصح بالإصلاح |
| 3 | حماية HIBP معطلة | متوسطة | يتطلب تفعيل يدوي |
| 4 | Extension في schema عام | منخفضة | مخاطر ضئيلة |

## 5. ما يعمل بشكل ممتاز

- 19 جدولاً مع RLS كامل بدون ثغرات
- 25 مشغلاً نشطاً للتدقيق وحماية البيانات
- منطق مالي موحد عبر `accountsCalculations.ts`
- حماية السنوات المقفلة على مستوى قاعدة البيانات
- نمط CRUD Factory موحد يضمن اتساق العمليات
- تسجيل دخول مؤمن مع مؤقت أمان وشاشة انتقالية
- حماية ضد هجمات التعداد في البحث بالهوية
- فصل كامل بين بيانات الناظر والمستفيدين عبر `beneficiaries_safe`
- سجل تدقيق غير قابل للحذف أو التعديل
