

# فحص الخطوط والجداول على الشاشات الصغيرة — التقرير والخطة

## ملخص الفحص

### 1. حجم الخطوط على الجوال

**لا توجد مشكلة جوهرية في حجم الخطوط.** المشروع يستخدم خط Tajawal مع أحجام Tailwind الافتراضية (`text-xs` = 0.75rem، `text-sm` = 0.875rem). لا توجد قواعد CSS تعدّل حجم الخط الأساسي (`font-size` على `html` أو `body`) بناءً على عرض الشاشة — أي أن الحجم ثابت عبر جميع الشاشات.

**ملاحظة:** بعض العناصر تستخدم `text-[10px]` (مثل labels في MobileCardView وبعض Badges) وهو حجم صغير جداً لشاشات 360px.

### 2. الجداول التي تفتقر لعرض بطاقات الجوال (المشكلة الرئيسية)

#### لوحة الناظر (Dashboard) — صفحات بها جداول بدون mobile cards:

| الصفحة | المكون | min-width |
|--------|--------|-----------|
| الحسابات | `AccountsContractsTable` | 750px |
| الحسابات | `AccountsCollectionTable` | 850px |
| الحسابات | `AccountsIncomeTable` | 350px |
| الحسابات | `AccountsExpensesTable` | يفترض مماثل |
| الحسابات | `AccountsDistributionTable` | يفترض مماثل |
| الحسابات | `AccountsBeneficiariesTable` | لا يوجد |
| الحسابات | `AccountsSavedTable` | يفترض مماثل |

هذه الجداول تُعرض بـ `overflow-x-auto` فقط — يعني تمرير أفقي على الجوال، تجربة سيئة.

#### لوحة المستفيد (Beneficiary) — صفحات بدون mobile cards:

| الصفحة | ملاحظة |
|--------|--------|
| `ContractsViewPage` | تستخدم `useIsMobile()` مع عرض بطاقات ✅ |
| `PropertiesViewPage` | تستخدم بطاقات مبنية مباشرة ✅ |
| `AccountsViewPage` | تعتمد على مكونات Accounts أعلاه — بدون mobile cards ❌ |
| `DisclosurePage` | لم يُفحص بعد — يحتاج فحص |
| `FinancialReportsPage` | لم يُفحص — يحتاج فحص |
| `NotificationsPage` | لم يُفحص — يحتاج فحص |

#### صفحات تم تحويلها بنجاح ✅:
InvoicesPage، IncomePage، ExpensesPage، UserManagement، AuditLog، HistoricalComparison، InvoicesViewPage، MySharePage، SupportPage، CarryforwardHistory، DistributeDialog

---

## خطة الإصلاح

### المرحلة 1: إضافة mobile cards للجداول الناقصة في مكونات الحسابات

**الملفات المتأثرة (6 ملفات):**

1. **`AccountsContractsTable.tsx`** — إضافة عرض بطاقات `md:hidden` يعرض: رقم العقد، المستأجر، قيمة الدفعة، الإيجار السنوي، الحالة، أزرار التعديل/الحذف

2. **`AccountsCollectionTable.tsx`** — إضافة بطاقات تعرض: المستأجر، الإيجار الشهري، المحصّل، المتأخرات، الحالة (مع دعم التعديل المضمّن)

3. **`AccountsIncomeTable.tsx`** — إضافة بطاقات بسيطة: المصدر + المبلغ

4. **`AccountsExpensesTable.tsx`** — نفس النمط

5. **`AccountsDistributionTable.tsx`** — بطاقات لبنود التوزيع

6. **`AccountsBeneficiariesTable.tsx`** — بطاقات: اسم المستفيد، النسبة، المبلغ المستحق

**النمط المتّبع لكل ملف:**
- إضافة `div.md:hidden` مع بطاقات Card
- لف الجدول الحالي بـ `div.hidden.md:block`
- الحفاظ على الإجماليات والتنبيهات مرئية في كلا العرضين

### المرحلة 2: فحص وإصلاح الصفحات المتبقية

- فحص `DisclosurePage`، `FinancialReportsPage`، `NotificationsPage` وإضافة mobile cards إن لزم

### المرحلة 3: تحسين أحجام الخطوط الصغيرة جداً

- رفع `text-[10px]` إلى `text-[11px]` في MobileCardView (field labels)
- مراجعة Badges التي تستخدم `text-[10px]` ورفعها لـ `text-xs` (12px) على الأقل

---

## التفاصيل التقنية

- جميع التعديلات تتبع النمط الموجود: `md:hidden` للبطاقات + `hidden md:block` للجدول
- لن يتأثر عرض Desktop إطلاقاً
- مكون `MobileCardView` العام يُستخدم حيث يناسب، وتُبنى بطاقات مخصصة للجداول المعقدة (مثل التحصيل بحقول تعديل)
- الأولوية للجداول ذات `min-width` أكبر من 500px لأنها الأكثر تأثراً

