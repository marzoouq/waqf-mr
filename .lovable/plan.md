

## الفحص الجنائي — الجولة السادسة (تقرير AdminDashboard الجولة الثانية: 14 بنداً)

### المنهجية: التحقق من كل بند مقابل الكود الفعلي

---

### التحقق بند بند

| # | البند | الادعاء | الحقيقة بعد الفحص | إصلاح؟ |
|---|-------|---------|-------------------|--------|
| **BUG-I** | 3 طرق مختلفة لحساب الإشغال | **✅ مؤكد** — `AdminDashboard` سطر 199 و`WaqifDashboard` سطر 86 يستخدمان `u.status === 'مؤجرة'` (نص ثابت في DB). `PropertiesPage` سطر 66 يعتمد على العقود النشطة `c.status === 'active'`. لا يوجد trigger يُزامن `unit.status` عند إنشاء/إنهاء عقد. **تعارض حقيقي بين مصدرين مختلفين.** الحل: توحيد المنهج في Dashboard/Waqif ليستخدم العقود النشطة مثل PropertiesPage | **نعم** |
| **BUG-J** | الفواتير الملغاة تُخفّض نسبة التحصيل | **✅ مؤكد** — سطر 105-113: `dueInvoices` يشمل كل الفواتير المستحقة بلا استثناء للملغاة. `totalExpected` يحسب مبالغ الملغاة في المقام. `totalCollected` لا يحسبها في البسط. **نتيجة: نسبة تحصيل منخفضة زوراً.** نفس المشكلة في `WaqifDashboard` سطر 68-80 (كود مُستنسخ). الحل: استبعاد `status === 'cancelled'` من `dueInvoices` | **نعم** |
| **BUG-K** | `avgRent` غير موحد (شهري/ربعي/سنوي) | **✅ مؤكد جزئياً** — `rent_amount` في DB schema هو إجمالي قيمة العقد (ليس شهرياً). لكن `avgRent = contractualRevenue / activeContractsCount` يعطي متوسط **إجمالي** العقد وليس متوسط شهري. **الرقم صحيح رياضياً لكن التسمية "متوسط الإيجار" مُضللة** — يجب أن يكون "متوسط قيمة العقد". تحسين UX بسيط | **لا** (تجميلي — DEFER-15) |
| **BUG-L** | `end_date` UTC vs توقيت محلي | **✅ مؤكد نظرياً** — `new Date('2026-04-01')` يُحلل كـ UTC midnight → في UTC+3 يصبح 03:00 صباحاً. `Date.now()` يعطي الوقت المحلي. الفرق ~3 ساعات من 30 يوماً (86400 ثانية × 30) = **تأثير ≤ 0.4%**. عملياً: عقد ينتهي اليوم سيظهر في التحذير حتى الساعة 3 صباحاً بتوقيت السعودية → **مقبول** | لا |
| **BUG-M** | رابط السُلف يؤشر لـ `/dashboard/beneficiaries` | **✅ مؤكد** — `PendingActionsTable` سطر 48: `link: '/dashboard/beneficiaries'`. تبويب السُلف (`AdvanceRequestsTab`) موجود في `/dashboard/accounts`. **الرابط يوصل لمكان صحيح جزئياً** — صفحة المستفيدين تعرض معلومات عن المستفيد مقدم الطلب. **لكن** البانر في `AdminDashboard` سطر 283 يوجه أيضاً لـ `/dashboard/beneficiaries`. الأفضل: `/dashboard/accounts` مع hash للتبويب | **نعم** (تحسين بسيط) |
| **BUG-N** | لون التحصيل المالي مقلوب في FiscalYearWidget | **❌ ليس مشكلة** — المنطق صحيح: إذا `financialProgress >= timeProgress` → أخضر (التحصيل يسبق الزمن). إذا أقل → أصفر (تأخر). هذا مقياس **وتيرة التحصيل** وليس مقارنة مطلقة. مقبول كمؤشر تشغيلي | لا |
| **BUG-O** | السُلف من سنوات مقفلة عند "عرض الكل" | **❌ بالتصميم** — عند `'all'`: `useAdvanceRequests(undefined)` يجلب كل السُلف. هذا مقصود — الناظر عند "عرض الكل" يريد رؤية **كل** الطلبات المعلقة بغض النظر عن السنة | لا |
| **ARCH-1** | 3 تعريفات مختلفة لـ collectionRate | **✅ مؤكد جزئياً** — `AdminDashboard` و`WaqifDashboard` يستخدمان نفس المنطق (مبالغ مستحقة حتى اليوم). `InvoiceSummaryCards` يستخدم `paidAmount / totalAmount` (كل الفواتير). **الفرق مقصود**: الأول = نسبة التحصيل التشغيلية (حتى اليوم)، الثاني = نسبة التحصيل الإجمالية (شاملة المستقبلية). **سياقان مختلفان** → ليس تعارضاً | لا |
| **ARCH-2** | تعارض شكل warnings بين نسختي close_fiscal_year | **❌ غير ذي صلة** — PostgreSQL `CREATE OR REPLACE FUNCTION` يُعيد تعريف الدالة بالكامل. النسخة الأخيرة (`025643`) هي الفعّالة دائماً. النسخ السابقة ليست "متعايشة" — كل migration يُعيد كتابة الدالة. الـ Frontend يقرأ `warnings` كـ `string[]` وهذا يتوافق مع `text[]` في النسخة الأخيرة. **وتم إصلاح قراءة warnings في الجولة 3 (BUG-B)** | لا |
| **ARCH-3** | `staleTime: 5min` للعقود اليتيمة | **❌ مقبول** — ربط عقد بسنة مالية عملية نادرة. 5 دقائق staleTime لن يُسبب ارتباكاً عملياً. إضافة invalidation مُحسِّنة لكن ليست ضرورية | لا (DEFER-16) |
| **ARCH-4** | `useAllUnits()` بلا فلتر سنة مالية | **❌ بالتصميم** — الوحدات ليس لها `fiscal_year_id`. الوحدة كيان ثابت (شقة/محل) لا يتغير بتغير السنة المالية. عدد الوحدات = عدد الوحدات الفعلي في المشروع. فلترتها بالسنة لا معنى لها | لا |
| **M-4** | `bun.lock` غير مُدرج في `.gitignore` | **❌ خطأ في التقرير** — تم دحضه في الجولة 3 (سطر 101 في plan.md) | لا |

---

### الإصلاحات المطلوبة — 3 تغييرات

**1. BUG-I: توحيد حساب الإشغال في AdminDashboard و WaqifDashboard**

بدلاً من `allUnits.filter(u => u.status === 'مؤجرة').length`، استخدام منطق العقود النشطة المُطابق لـ `PropertiesPage`:

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 196-201
```typescript
// حساب الوحدات المؤجرة بناءً على العقود النشطة (مطابق لـ PropertiesPage)
const rentedUnitIds = new Set(
  fyContracts.filter(c => c.status === 'active' && c.unit_id).map(c => c.unit_id)
);
const wholePropertyRentedIds = new Set(
  fyContracts.filter(c => c.status === 'active' && !c.unit_id).map(c => c.property_id)
);
// وحدات مؤجرة مباشرة + وحدات في عقارات مؤجرة بالكامل
const rentedUnits = allUnits.filter(u =>
  rentedUnitIds.has(u.id) || wholePropertyRentedIds.has(u.property_id)
).length;
const totalUnitsCount = allUnits.length;
const occupancyRate = totalUnitsCount > 0 ? Math.round((rentedUnits / totalUnitsCount) * 100) : 0;
```

**الملف:** `src/pages/beneficiary/WaqifDashboard.tsx` سطر 84-88 — نفس التغيير

**2. BUG-J: استبعاد الفواتير الملغاة من حساب نسبة التحصيل**

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 105-106
```typescript
const dueInvoices = paymentInvoices.filter(
  inv => relevantContractIds.has(inv.contract_id)
    && new Date(inv.due_date) <= nowDate
    && inv.status !== 'cancelled'  // ← إضافة
);
```

**الملف:** `src/pages/beneficiary/WaqifDashboard.tsx` سطر 68-69 — نفس التغيير

**3. BUG-M: تحسين رابط السُلف المعلقة**

**الملف:** `src/components/dashboard/PendingActionsTable.tsx` سطر 48
```typescript
link: '/dashboard/accounts',  // بدلاً من '/dashboard/beneficiaries'
```

**الملف:** `src/pages/dashboard/AdminDashboard.tsx` سطر 283
```typescript
<Link to="/dashboard/accounts">  // بدلاً من '/dashboard/beneficiaries'
```

---

### بنود مؤجلة جديدة

| # | المصدر | البند | الوصف | الأولوية |
|---|--------|-------|-------|---------|
| DEFER-15 | الجولة 6 — BUG-K | تسمية "متوسط الإيجار" مُضللة | القيمة = متوسط إجمالي العقد وليس شهرياً — تغيير التسمية | منخفضة |
| DEFER-16 | الجولة 6 — ARCH-3 | invalidation للعقود اليتيمة بعد mutation | إضافة `invalidateQueries(['contracts','orphaned'])` عند تعديل `fiscal_year_id` | منخفضة |

---

### ملخص التأثير

- **3 ملفات** تُعدَّل: `AdminDashboard.tsx`, `WaqifDashboard.tsx`, `PendingActionsTable.tsx`
- لا تغييرات في قاعدة البيانات
- **2 بند جديد** مسجل للتأجيل (DEFER-15, DEFER-16)
- من أصل 14 بنداً: **3 مؤكدة للإصلاح**, **2 مؤجلة**, **9 مدحوضة/بالتصميم**
- تحديث `.lovable/plan.md` إلى الإصدار السابع

