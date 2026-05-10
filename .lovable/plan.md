## السياق

- 14 مستفيد ثابت، لا تسجيل جديد. السياسة: **شفافية كاملة** افتراضياً.
- المشكلة الحالية: العقود (وما يتفرع عنها من بيانات تاريخية) مخفية عن المستفيد/الواقف لأن جدول `contracts` لا يملك سياسة `SELECT` لهذين الدورين، فيرجع `contracts_safe` فارغاً.
- البنية موجودة: `app_settings.beneficiary_sections` + `BeneficiaryTab` يسمحان للناظر بتشغيل/إطفاء أقسام واجهة المستفيد. لكنها ناقصة بعض المفاتيح.

## الهدف

1. فتح قراءة العقود (مع إخفاء PII عبر `contracts_safe` فقط) للمستفيد والواقف.
2. ضمان أن جميع الجداول التي تُغذّي صفحات المستفيد لديها سياسات قراءة (الأغلبية موجود — تحقق فقط).
3. توسيع لوحة "واجهة المستفيد" لدى الناظر لتشمل كل المفاتيح بحيث يكون له **التحكم الكامل** بما يظهر/يخفى.

## التغييرات

### 1) Migration — سياسة SELECT للعقود

```sql
CREATE POLICY "Beneficiaries and waqif can view contracts"
ON public.contracts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'beneficiary'::app_role)
  OR has_role(auth.uid(),'waqif'::app_role)
);
```

السياسة التقييدية `Restrict unpublished fiscal year data on contracts` تبقى كما هي → السنوات غير المنشورة محجوبة، والمنشورة (بما فيها المقفلة) تظهر. PII محجوب لأن الواجهة تستخدم `contracts_safe` (security_invoker=on) ولا تختار الأعمدة الحساسة.

### 2) لا حاجة لسياسات إضافية

- `units`, `contract_fiscal_allocations`, `payment_invoices`, `accounts`, `expenses`, `income`, `properties` — كلها تملك بالفعل سياسات SELECT لـ beneficiary/waqif. ✅

### 3) توسيع تحكم الناظر بأقسام واجهة المستفيد

- إضافة المفاتيح الناقصة إلى `BENEFICIARY_SECTION_KEYS` و `SECTION_LABELS` في `src/constants/sections.ts` لتغطية كامل قائمة `allBeneficiaryLinks`:
  - `carryforward` (الترحيلات والخصومات)
  - `financial_reports` (التقارير المالية — منفصل عن `reports`)
  - `settings` (إعدادات الحساب — اختياري للإطفاء)
- لا تغيير على شكل `BeneficiaryTab` — يقرأ المفاتيح تلقائياً.
- `useNavLinks` و route guards يستخدمان `beneficiarySections` بالفعل، لذلك المفاتيح الجديدة ستفعِّل/تطفِّء روابط المستفيد فوراً.

### 4) لا تغييرات على واجهة المستفيد نفسها

العقود ستظهر تلقائياً بمجرد تطبيق السياسة لأن الصفحات والـ hooks جاهزة وتستخدم `contracts_safe`.

## التحقق بعد التطبيق

1. الدخول كمستفيد → `/beneficiary/contracts` يعرض العقود (بما فيها العقود في السنة المقفلة 2024-2025) بدون أرقام هوية/سجلات تجارية.
2. الناظر في `الإعدادات → واجهة المستفيد` يرى مفاتيح إضافية ويمكنه إطفاء أي قسم → القسم يختفي من قائمة المستفيد فوراً.
3. السنة غير المنشورة لا تزال محجوبة (سياسة RESTRICTIVE).

## خارج النطاق

- لم يُطلب: تعديل قواعد سنوات مقفلة، تغيير منطق فواتير متأخرة، تشديد `validate_fiscal_year_closure`. تُترك كما هي.
