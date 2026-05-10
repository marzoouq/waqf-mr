# توحيد منطق حساب التحصيل بين لوحة الناظر ولوحة المستفيد

## الهدف
1. إزالة فقدان الفواتير عابرة السنوات في لوحة المستفيد (الفاتورة سنتها X وعقدها سنته Y).
2. تعريف موحّد لـ "مسددة" = `paid` ∪ `partially_paid`، وتعريف موحّد لـ "متأخرة" = كل ما عداها (مع شرط `due_date ≤ today`).
3. عرض شفاف لقاعدة العدّ بجانب البطاقة.

## السبب الجذري
`computeCollectionSummary` يبني `relevantContractIds` من قائمة `contracts` التي يجلبها العميل بفلتر `contract.fiscal_year_id = السنة`. لو كانت الفاتورة في السنة الحالية لكن عقدها مسجّل في سنة أخرى → يُسقطها الفلتر. الناظر يستخدم RPC على السيرفر يربط `payment_invoices ⨝ contracts` مباشرةً ولا يتأثر.

## التغييرات

### 1) `src/utils/financial/dashboardComputations.ts`
- اعتماد حالة العقد المضمّنة في الفاتورة (`inv.contract?.status`) بدلاً من البحث في مصفوفة `contracts`.
- توقيع جديد: `computeCollectionSummary(paymentInvoices)` — حذف معامل `contracts` غير الضروري.
- الفلتر الموحّد المطابق لـ RPC الناظر:
  ```
  contract.status ∈ {active, expired}  AND  due_date ≤ today
  ```
- الإخراج يحتفظ بالحقول الحالية (`paidCount`, `partialCount`, `unpaidCount`, `total`, `percentage`, `totalCollected`, `totalExpected`) مع توضيح: `paidCount` و `partialCount` كلاهما يدخل في حساب المسدد، `unpaidCount = total - paidCount - partialCount`.
- تحديث `computeCollectionSummary.test.ts` للتوقيع الجديد + سيناريو "فاتورة عقدها بسنة مختلفة" يجب أن تُحتسب.

### 2) `src/hooks/data/invoices/usePaymentInvoices.ts`
- التأكد من أن الـ `select` يجلب `contract:contracts(status, ...)` (موجود فعلاً، فقط نضيف `status` لو لم يكن).

### 3) `src/hooks/page/beneficiary/dashboard/useWaqifDashboardPage.ts`
- استدعاء `computeCollectionSummary(paymentInvoices)` فقط.
- توحيد التعريف في `collectionSummary` المُمرَّر للواجهة:
  ```
  onTime  = paidCount + partialCount     // المسدد كلياً أو جزئياً
  late    = unpaidCount
  total   = paidCount + partialCount + unpaidCount
  ```

### 4) `src/hooks/page/admin/dashboard/useAdminDashboardStats.ts`
- لا تغيير في مصدر البيانات (تبقى من RPC).
- لا تغيير في الحقول لكن نضيف حقل مساعد للعرض: `paidLikeCount = paidCount + partialCount` ليُستخدم في تلميح الشفافية.

### 5) RPC `get_dashboard_full_summary` (هجرة)
- لا تغيير في الفلتر (هو المرجع الموحّد).
- إضافة تعليق توثيقي يوضح القاعدة الموحّدة، لتسهيل المراجعة المستقبلية.

### 6) عرض منطق العدّ للمستخدم
- في `CollectionSummaryCard` (الناظر) و `WaqifFinancialSection` (المستفيد): إضافة Tooltip/سطر شرح صغير أسفل البطاقة:
  > "يشمل الفواتير التي حلّ تاريخ استحقاقها فقط، وعقودها نشطة أو منتهية. المسدد = مدفوعة كاملة أو جزئية."
- نص ثابت من `src/constants/` (مفتاح: `COLLECTION_SUMMARY_RULE_AR`) لتفادي التكرار.

### 7) ملاحظة فرق العرض الحالي
- `WaqifFinancialSection` يعرض خانتين فقط (مسدد/متأخر). يبقى كما هو لكن `onTime` الآن دقيق.
- `CollectionSummaryCard` يعرض ثلاث خانات (مسدد/جزئي/متأخر). يبقى كما هو.
- المجموع والنسبة سيتطابقان بين اللوحتين لنفس السنة المالية.

## ما لن يتغير
- لا تعديل على RLS أو سياسة `is_fiscal_year_accessible`.
- لا تعديل على `get_beneficiary_dashboard` (لأنه لا يحسب التحصيل أصلاً).
- لا تغيير في طريقة جلب العقود لأي شاشة أخرى.

## التحقق بعد التنفيذ
- اختبار الوحدة: فاتورة سنتها A، عقدها سنته B بحالة expired → تُحتسب عند الاستعلام بسنة A.
- مطابقة يدوية: لنفس السنة المالية، نسبة التحصيل وعدد الفواتير في بطاقة الناظر = (مسدد+جزئي / إجمالي) × 100 = نفس القيمة في بطاقة المستفيد.
- اختبار الانحدار: `computeCollectionSummary.test.ts` يمر.

## مخاطر
- أي مستهلك حالي لـ `computeCollectionSummary` يمرّر `contracts` كمعامل أول سيكسر. سأبحث عن كل المستدعين قبل التغيير وأحدّثهم في نفس التعديل (حالياً معروف: `useWaqifDashboardPage`، `WaqifFinancialSection` غير المباشر، الاختبار).
