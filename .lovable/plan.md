

# خطة تصحيح البيانات المفقودة

## المشكلة
عند مقارنة ملف الإقفال السنوي مع قاعدة البيانات، تبين أن هناك بنوداً مالية مهمة غير مسجلة رغم أن الأرقام النهائية صحيحة.

## البنود المفقودة

### 1. ضريبة القيمة المضافة (92,912.93 ريال)
ضريبة القيمة المضافة المحصلة من الهيئة غير مسجلة كمصروف في جدول المصروفات. هذا يعني أن إجمالي المصروفات المعروض (125,239.85) لا يشمل الضريبة، بينما الملف الرسمي يخصمها قبل حساب الحصص.

### 2. بيانات التوزيع والرقبة
- التوزيعات الفعلية: 995,000 ريال (غير مسجلة)
- رقبة الوقف: 107,913.20 ريال (غير مسجلة)

---

## خطة التنفيذ

### المرحلة 1: إضافة ضريبة القيمة المضافة
إضافة سجل مصروف جديد في جدول expenses:
- النوع: أخرى
- المبلغ: 92,912.93
- الوصف: ضريبة القيمة المضافة المحصلة من الهيئة

### المرحلة 2: تحديث جدول الحسابات
تحديث سجل الحسابات الختامية ليعكس إجمالي المصروفات الصحيح شاملاً الضريبة (218,152.78 بدلاً من 125,239.85).

### المرحلة 3: تسجيل التوزيعات ورقبة الوقف
تحديث أو إضافة حقول في جدول الحسابات لتسجيل:
- مبلغ التوزيعات الفعلية: 995,000 ريال
- رقبة الوقف: 107,913.20 ريال

---

## القسم التقني

### تغييرات قاعدة البيانات

**1. إضافة أعمدة جديدة لجدول accounts (Migration)**

```text
ALTER TABLE accounts ADD COLUMN vat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN distributions_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN waqf_capital numeric NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN net_after_expenses numeric NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN net_after_vat numeric NOT NULL DEFAULT 0;
```

**2. إدخال بيانات (Data Insert/Update)**

- INSERT مصروف ضريبة القيمة المضافة في جدول expenses
- UPDATE سجل الحسابات الختامية بالقيم الجديدة:
  - vat_amount = 92912.93
  - total_expenses = 218152.78 (شاملة الضريبة)
  - net_after_expenses = 1365140.15
  - net_after_vat = 1272227.22
  - distributions_amount = 995000
  - waqf_capital = 107913.20

**3. تحديث واجهة الحسابات الختامية**

تعديل `src/pages/dashboard/AccountsPage.tsx` لعرض البنود الإضافية:
- صف "الصافي بعد المصاريف"
- صف "ضريبة القيمة المضافة"
- صف "الصافي بعد خصم الضريبة"
- صف "التوزيعات"
- صف "رقبة الوقف"

**4. تحديث hook الحسابات**

تعديل `src/hooks/useAccounts.ts` لقراءة الأعمدة الجديدة.

**5. تحديث تقارير PDF**

تعديل `src/utils/pdfGenerator.ts` لتضمين البنود الجديدة في التقارير المصدرة.

### الملفات المتأثرة:
- `src/pages/dashboard/AccountsPage.tsx`
- `src/hooks/useAccounts.ts`
- `src/utils/pdfGenerator.ts`
- `src/types/database.ts`
- Migration SQL جديد لإضافة الأعمدة

