

# تصحيح الخطة: حساب الضريبة (VAT) على التجاري فقط + التسلسل المالي الكامل

---

## التصحيح المطلوب على الخطة السابقة

الضريبة لا تُحسب على كل الإيرادات. القاعدة:
- **العقارات التجارية** (محلات، معارض): تخضع لضريبة القيمة المضافة 15%
- **العقارات السكنية** (شقق): معفاة حالياً لكن قد يتغير القرار مستقبلاً

---

## البيانات الحالية في النظام

| العقار | النوع | ملاحظة |
|--------|-------|--------|
| 001 | تجاري | يخضع للضريبة |
| 002 | تجاري سكني | مختلط (الوحدات: محل = ضريبة، شقة = معفي) |
| 003 | تجاري سكني | مختلط |
| 101 | مبنى سكني | معفي |
| 102 | شقق سكنية | معفي (لكن يوجد "محل الشاورما" فيه!) |

أنواع الوحدات: "محل" و "شقة"

---

## التسلسل المالي الصحيح النهائي

```text
إجمالي الإيرادات
  (-) المصروفات التشغيلية
  = الصافي بعد المصاريف
  (-) ضريبة القيمة المضافة (15% من إيجارات المحلات/التجاري فقط)
  = الصافي بعد الضريبة
  (-) الزكاة (مبلغ يدوي)
  = الصافي بعد الزكاة
  (-) حصة الناظر (10% من الصافي بعد الزكاة)
  = الباقي بعد حصة الناظر
  (-) حصة الواقف (5% من الباقي بعد حصة الناظر) [تتابعي]
  = ريع الوقف
  (-) رقبة الوقف (مبلغ يدوي يحدده الناظر)
  = المبلغ القابل للتوزيع على المستفيدين
```

---

## التغييرات المطلوبة

### 1. قاعدة البيانات

إضافة 3 أعمدة لجدول `accounts`:
- `zakat_amount` (numeric, افتراضي 0) - مبلغ الزكاة اليدوي
- `waqf_corpus_manual` (numeric, افتراضي 0) - مبلغ رقبة الوقف اليدوي
- `residential_vat_exempt` (boolean, افتراضي true) - إعفاء السكني من الضريبة

إضافة إعداد في `app_settings`:
- `vat_percentage` (افتراضي "15") - نسبة الضريبة
- `residential_vat_exempt` (افتراضي "true") - هل السكني معفي

### 2. حساب الضريبة التلقائي (AccountsPage.tsx)

بدلا من قراءة الضريبة من المصروفات، يتم حسابها تلقائيا:
- جلب العقود مع بيانات العقار والوحدة
- تحديد العقود التجارية: إذا كان نوع الوحدة "محل" أو نوع العقار "تجاري"
- حساب VAT = مجموع إيجارات العقود التجارية x 15%
- إذا تم تعطيل إعفاء السكني مستقبلاً: يشمل الكل

### 3. تصحيح التسلسل التتابعي (AccountsPage.tsx)

الحالي (خطأ):
```text
adminShare = netRevenue x 10%
waqifShare = netRevenue x 5%    // متوازي - خطأ
```

الجديد (صحيح):
```text
netAfterZakat = netAfterVat - zakatAmount
adminShare = netAfterZakat x 10%
afterAdmin = netAfterZakat - adminShare
waqifShare = afterAdmin x 5%    // تتابعي - من الباقي بعد الناظر
waqfRevenue = afterAdmin - waqifShare
distributable = waqfRevenue - waqfCorpusManual
```

### 4. واجهة المستخدم (AccountsPage.tsx)

- إضافة حقل إدخال "مبلغ الزكاة" (يدوي)
- إضافة حقل إدخال "رقبة الوقف" (يدوي يحدده الناظر)
- عرض تفصيل الضريبة: إيجارات تجارية خاضعة / سكنية معفاة
- إضافة إعداد "إعفاء السكني" (مفتاح تبديل) في الإعدادات

### 5. تحديث جميع الصفحات المرتبطة

- `ReportsPage.tsx` - التسلسل التتابعي + الضريبة التجارية + الزكاة
- `BeneficiaryDashboard.tsx` - عرض التسلسل الجديد للمستفيدين
- `DisclosurePage.tsx` - الإفصاح السنوي
- `MySharePage.tsx` - حصة المستفيد
- `FinancialReportsPage.tsx` - التقارير المالية
- `AccountsViewPage.tsx` - عرض الحسابات
- `pdfGenerator.ts` - تصدير PDF بالتسلسل الجديد

### 6. تحديث النسب الديناميكية (ReportsPage.tsx)

استخدام `useAppSettings` لقراءة النسب بدلا من القيم الثابتة 10%/5%

### 7. إضافة DialogDescription (جميع الحوارات)

إضافة `DialogDescription` مخفي (`sr-only`) لكل حوار Dialog في 10 ملفات لإزالة تحذيرات المتصفح

### 8. التحقق من نسب المستفيدين

إضافة تحذير إذا تجاوز مجموع نسب المستفيدين 100% في AccountsPage وBeneficiariesPage

---

## مثال رقمي بالتسلسل الجديد

| البند | المبلغ |
|-------|--------|
| إجمالي الإيرادات | 1,490,380 |
| (-) المصروفات التشغيلية | 125,240 |
| = الصافي بعد المصاريف | 1,365,140 |
| إيجارات تجارية خاضعة للضريبة | 619,192 |
| (-) ضريبة 15% | 92,879 |
| = الصافي بعد الضريبة | 1,272,261 |
| (-) الزكاة (يدوي) | 0 |
| = الصافي بعد الزكاة | 1,272,261 |
| (-) حصة الناظر 10% | 127,226 |
| = بعد الناظر | 1,145,035 |
| (-) حصة الواقف 5% من بعد الناظر | 57,252 |
| = ريع الوقف | 1,087,783 |
| (-) رقبة الوقف (يدوي) | حسب الناظر |
| = للتوزيع | الباقي |

---

## قسم تقني

### Migration SQL:
```text
ALTER TABLE accounts ADD COLUMN zakat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN waqf_corpus_manual numeric NOT NULL DEFAULT 0;

INSERT INTO app_settings (key, value) VALUES ('vat_percentage', '15') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (key, value) VALUES ('residential_vat_exempt', 'true') ON CONFLICT (key) DO NOTHING;
```

### منطق تحديد العقود التجارية:
```text
// عقد تجاري إذا:
// 1. نوع الوحدة = "محل" أو
// 2. نوع العقار = "تجاري" (وليس له وحدة محددة)
const isCommercial = (contract) => {
  if (contract.unit?.unit_type === 'محل') return true;
  if (!contract.unit_id && contract.property?.property_type === 'تجاري') return true;
  return false;
};
// إذا تم تعطيل الإعفاء: جميع العقود تخضع
```

### الملفات المتأثرة (الإجمالي):
1. `AccountsPage.tsx` - التسلسل + الضريبة + الزكاة + رقبة الوقف
2. `ReportsPage.tsx` - التسلسل + النسب الديناميكية
3. `BeneficiaryDashboard.tsx` - العرض
4. `DisclosurePage.tsx` - الإفصاح
5. `MySharePage.tsx` - حصتي
6. `FinancialReportsPage.tsx` - التقارير
7. `AccountsViewPage.tsx` - الحسابات
8. `pdfGenerator.ts` - التصدير
9. `PropertiesPage.tsx` - DialogDescription
10. `ContractsPage.tsx` - DialogDescription
11. `ExpensesPage.tsx` - DialogDescription
12. `IncomePage.tsx` - DialogDescription
13. `BeneficiariesPage.tsx` - DialogDescription + تحقق النسب
14. `InvoicesPage.tsx` - DialogDescription
15. `UserManagementPage.tsx` - DialogDescription
16. `MessagesPage.tsx` - DialogDescription
17. `BeneficiaryMessagesPage.tsx` - DialogDescription

