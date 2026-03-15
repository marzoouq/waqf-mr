

# تقرير الفحص الجنائي الهجين — 2026-03-15

---

## 1. نتائج الفحص الأمني (Security Scan)

### 🔴 حرج — تسريب بيانات المستأجرين للمستفيدين
**الجدول:** `contracts`
**المشكلة:** سياسة RLS `Authorized roles can view contracts` تمنح المستفيدين والواقف صلاحية SELECT على كامل الجدول، بما فيه:
- `tenant_id_number` (رقم الهوية)
- `tenant_id_type`, `tenant_crn`, `tenant_tax_number`
- `tenant_street`, `tenant_district`, `tenant_city`, `tenant_postal_code`, `tenant_building`

**الوضع الحالي:** يوجد View آمن `contracts_safe` يحجب هذه الحقول عن غير الناظر/المحاسب — لكن الجدول الأصلي لا يزال مكشوفاً مباشرة عبر API.

**الإصلاح:** تعديل سياسة RLS للمستفيدين/الواقف على جدول `contracts` بإضافة سياسة RESTRICTIVE تمنع الوصول المباشر، أو حذف دورَي beneficiary/waqif من السياسة الحالية وإجبارهم على استخدام `contracts_safe` فقط.

### 🟡 تحذير — Views بدون RLS مباشر
- `contracts_safe` و `beneficiaries_safe` — هما Views وليسا جداول، وبالتالي يرثان RLS من الجداول الأصلية عبر `security_invoker`. هذا سلوك صحيح وليس ثغرة فعلية.

### ✅ سليم
- Supabase Linter: لا مشاكل
- Console: لا أخطاء runtime
- Network: لا طلبات فاشلة
- سياسات `messages` UPDATE: محمية ضد التلاعب (WITH CHECK)

---

## 2. المهام المتبقية بحسب الأولوية (من plan.md)

### 🔴 حرج — لم يُنفَّذ بعد
| # | المهمة | النوع |
|---|--------|-------|
| SEC-1 | إصلاح تسريب PII من جدول contracts | أمان |
| C-1 | جدول استحقاقات شهري (12 شهر × عقود) | عقود |
| E-2 | ميزانية تقديرية لكل فئة مصروفات + تحذير 80% | مصروفات |
| U-1 | ربط المستخدم بمستفيد من صفحة إدارة المستخدمين | مستخدمين |

---

## 3. خطة التنفيذ المقترحة

### الخطوة 1: SEC-1 — إصلاح تسريب بيانات المستأجرين
**Migration SQL:**
- حذف `beneficiary` و `waqif` من سياسة `Authorized roles can view contracts`
- إبقاء السياسة لـ `admin` + `accountant` فقط
- المستفيدون والواقف سيستخدمون `contracts_safe` حصراً (مُطبَّق فعلاً في الكود عبر `useContractsSafeByFiscalYear`)

### الخطوة 2: C-1 — جدول الاستحقاقات الشهري
- مكون `MonthlyAccrualTable` يعرض شبكة 12 شهر × عقود نشطة
- يحسب المبلغ المستحق لكل شهر بناءً على `payment_type` و `rent_amount`
- يُدمج في `ContractsPage.tsx` كتبويب جديد

### الخطوة 3: U-1 — ربط المستخدم بمستفيد
- إضافة Dropdown في `UserManagementPage` يعرض المستفيدين غير المربوطين
- عند الربط: تحديث `beneficiaries.user_id` ليساوي `user.id`
- يتطلب صلاحية admin فقط

### الخطوة 4: E-2 — ميزانية تقديرية للمصروفات
- جدول `expense_budgets` جديد: `(id, fiscal_year_id, expense_type, budget_amount)`
- مكون `ExpenseBudgetBar` يعرض شريط تقدم لكل فئة مع تحذير أحمر عند تجاوز 80%
- يُدمج في `ExpensesPage.tsx`

---

## 4. ملخص الحالة العامة

| المحور | الحالة |
|--------|--------|
| بناء التطبيق | ✅ سليم — لا أخطاء |
| الاختبارات | ✅ 540+ اختبار ناجح |
| Console Runtime | ✅ نظيف |
| RLS Policies | ⚠️ ثغرة واحدة حرجة (contracts PII) |
| Supabase Linter | ✅ لا مشاكل |
| الخطة المنجزة | ~45% من البنود المطلوبة |

