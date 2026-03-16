

# تقرير الفحص الجنائي الهجين — 2026-03-16

---

## النتائج المكتشفة

### 🔴 خطأ حرج — `callAdminApi` تستخدم `getSession()` بدون `getUser()`

**الملف:** `src/pages/dashboard/UserManagementPage.tsx` سطر 33
**المشكلة:** الدالة تستخرج `access_token` من `getSession()` مباشرة دون التحقق من صلاحية المستخدم عبر `getUser()` أولاً. هذا يخالف سياسة المشروع الأمنية الموثقة في `supabase/functions/README.md`.
**الخطر:** `getSession()` تثق بالعميل — إذا انتهت صلاحية الـ JWT أو تم التلاعب به محلياً، سيُرسل طلب غير آمن لدالة `admin-manage-users` (التي تتحقق داخلياً، لكن المبدأ خاطئ).
**الملفات المتأثرة:** `UserManagementPage.tsx`، `BeneficiariesPage.tsx` (سطر 44)
**الإصلاح:** إضافة `await supabase.auth.getUser()` قبل `getSession()` كما هو مُطبَّق في `useInvoices.ts` و `AiAssistant.tsx`.

---

### 🔴 خطأ منطقي — حساب الاستحقاق الشهري يتجاهل `payment_type`

**الملف:** `src/components/contracts/MonthlyAccrualTable.tsx` سطر 23-26
**المشكلة:** الدالة `getMonthlyAmount` تحسب دائماً `rent_amount / 12` بغض النظر عن `payment_type`. عقد بدفع ربع سنوي (quarterly) مبلغه 30,000 سيظهر كـ 2,500/شهر بدلاً من الحساب الصحيح.
**الإصلاح:** استخدام `payment_type` لتحديد المقسوم عليه:
- `monthly` → `rent_amount` مباشرة (المبلغ شهري أصلاً)
- `quarterly` → `rent_amount / 3` (ثم توزيع على أشهر الفترة)
- `semi_annual` → `rent_amount / 6`
- `annual` → `rent_amount / 12`

---

### 🟡 تحذير — مفاتيح أجنبية بدون `ON DELETE` قد تمنع الحذف

**الجداول:** `accounts`, `advance_carryforward`, `advance_requests`, `expenses`, `income`, `invoices`, `payment_invoices` وغيرها
**المشكلة:** 20 مفتاح أجنبي على `fiscal_year_id` و `property_id` و `contract_id` لا تحتوي على `ON DELETE CASCADE` أو `ON DELETE SET NULL`. حذف سنة مالية أو عقار سيفشل مع خطأ FK violation.
**الأثر:** ليس ثغرة أمنية، لكنه يمنع عمليات التنظيف ويسبب أخطاء runtime عند محاولة الحذف.
**الإصلاح:** إضافة `ON DELETE CASCADE` للعلاقات التابعة (مثل expenses→fiscal_years) و `ON DELETE SET NULL` للعلاقات الاختيارية.

---

### 🟡 تحذير — `ExpenseBudgetBar` يستخدم `supabase as any`

**الملف:** `src/components/expenses/ExpenseBudgetBar.tsx` أسطر 42, 79
**المشكلة:** جدول `expense_budgets` غير مُضاف لملف الأنماط المُولَّد (`types.ts`)، مما يجبر المطور على استخدام `as any` — يفقد الحماية النوعية ويُخفي أخطاء محتملة.
**الإصلاح:** بعد تحديث `types.ts` تلقائياً (عبر إعادة ربط قاعدة البيانات)، إزالة `as any` واستخدام الأنماط الصحيحة.

---

### 🟡 تحذير — Supabase Linter: Security Definer View

**العرض:** `contracts_safe`
**المشكلة:** المُحلل يُحذر أن هذا View يعمل بصلاحيات المالك (SECURITY DEFINER) ويتجاوز RLS.
**الحكم:** هذا **تصميم مقصود** — المستفيدون أُزيلوا من RLS على جدول `contracts`، والـ View يفرض التحكم داخلياً عبر `has_role()` في `WHERE`. لا حاجة لإصلاح، لكن يجب توثيقه كاستثناء أمني مُعتمد.

---

### ✅ نتائج سليمة

| المحور | الحالة |
|--------|--------|
| Console Runtime | نظيف — لا أخطاء ولا تحذيرات |
| Network Requests | نظيف — لا طلبات فاشلة |
| Supabase Linter | تحذير واحد (Security Definer View — مقصود) |
| سلامة البيانات | لا بيانات يتيمة — جميع FKs سليمة حالياً |
| نسبة المستفيدين | 100% — سليمة |
| الفهارس (Indexes) | شاملة على جميع الجداول الأساسية |
| سياسات RLS | مُطبقة على جميع الجداول (115 سياسة) |
| الاختبارات | 540+ ناجح |

---

## خطة التنفيذ

### الخطوة 1: إصلاح `getSession()` بدون `getUser()` (أمان)
- إضافة `getUser()` قبل `getSession()` في `callAdminApi` و `BeneficiariesPage.tsx`

### الخطوة 2: إصلاح حساب الاستحقاق الشهري (منطق)
- تعديل `getMonthlyAmount` في `MonthlyAccrualTable.tsx` ليعتمد على `payment_type`

### الخطوة 3: إضافة ON DELETE على FKs الحرجة (قاعدة بيانات)
- Migration لإضافة `ON DELETE CASCADE/SET NULL` على المفاتيح الأجنبية التي تفتقر لها

### الخطوة 4: توثيق استثناء Security Definer
- تحديث `.lovable/plan.md` بالنتائج

