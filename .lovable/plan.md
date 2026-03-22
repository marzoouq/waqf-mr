

# تقرير الفحص الجنائي — أخطاء البناء ومشاكل البرمجة

---

## المنهجية

فحص شامل لـ: TypeScript type safety، أنماط React، أمان قاعدة البيانات، أداء الكود، وأنماط البرمجة السيئة.

---

## المشاكل المكتشفة

### 🔴 B-01: `supabase as any` غير ضروري في ExpenseBudgetBar (متوسطة)

**الملف:** `src/components/expenses/ExpenseBudgetBar.tsx` سطر 44, 81

**المشكلة:** يستخدم `(supabase as any).from('expense_budgets')` رغم أن جدول `expense_budgets` **موجود بالفعل** في `types.ts` (سطر 759-793) بتعريف كامل (Row, Insert, Update).

**التأثير:**
- فقدان Type Safety على جميع عمليات SELECT/INSERT/UPDATE
- لا يكتشف المترجم أخطاء الأعمدة أو القيم
- ضد المعايير المتبعة في باقي المشروع

**الإصلاح:** إزالة `as any` واستخدام `supabase.from('expense_budgets')` مباشرة (3 مواضع).

---

### 🟡 B-02: 5 صفحات بـ `invalidateQueries()` بدون queryKey (منخفضة-متوسطة)

**الملفات:**

| الصفحة | السطر | queryKey المناسب |
|--------|-------|-----------------|
| `NotificationsPage.tsx` | 44 | `['notifications']` |
| `InvoicesViewPage.tsx` | 27 | `['invoices']` |
| `BylawsViewPage.tsx` | 21 | `['bylaws']` |
| `BeneficiaryMessagesPage.tsx` | 21 | `['conversations']` |
| `AccountsViewPage.tsx` | 22 | `['accounts']` |

**التأثير:** ضغط "إعادة المحاولة" يمسح **كل** cache التطبيق — يُعيد تحميل جميع البيانات بلا داعٍ.

**الإصلاح:** تحديد `queryKey` مناسب لكل صفحة (سطر واحد لكل ملف).

---

### 🟡 B-03: Security Definer View — `contracts_safe` (تمت مناقشتها سابقاً)

**المصدر:** Supabase Linter + Security Scan

العرضان `beneficiaries_safe` و `contracts_safe` يستخدمان `security_invoker=false`. هذا **مقصود بالتصميم** (memory مؤكدة) لأن المستفيد/الواقف لا يملكان صلاحية SELECT مباشرة على الجداول الأساسية. التقنيع يتم عبر `CASE WHEN`.

**الحكم:** ⚠️ ملاحظة معروفة ومقبولة — لا إصلاح مطلوب حالياً.

---

### 🟢 B-04: استخدام `key={index}` في القوائم (منخفضة جداً)

**38 ملف** يستخدم `key={index}` أو `key={i}`. معظمها في:
- قوائم ثابتة (skeletons، نجوم التقييم، إحصائيات) — **مقبول**
- قوائم ديناميكية (بعض الجداول) — **لا تأثير عملي** لأن العناصر لا تُعاد ترتيبها

**الحكم:** لا إصلاح مطلوب — الاستخدام مقبول في السياقات الحالية.

---

### 🟢 B-05: `as any` في ملفات الاختبار فقط (مقبول)

22 ملف اختبار يستخدم `as any` لـ mocking — **هذا نمط قياسي** في اختبارات TypeScript/Vitest.

**الحكم:** مقبول — لا إصلاح مطلوب.

---

### 🟢 B-06: `@ts-ignore` واحد فقط (مقبول)

في `src/utils/pdf/arabicReshaper.ts` — مكتبة `arabic-reshaper` بدون تعريفات TypeScript. **لا بديل**.

---

### 🟢 B-07: `console.log/error` في الواجهة (سليم)

الواجهة الأمامية (`src/`) تستخدم `logger` مركزي يكتم الرسائل في الإنتاج. المواضع الوحيدة المباشرة: