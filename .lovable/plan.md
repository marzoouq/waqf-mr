

# خطة إصلاح كارثة التوزيعات

## المشاكل المكتشفة

### 1. توزيعات بدون سنة مالية (خطير)
جميع التوزيعات الـ 14 المسجلة تحت الحساب الختامي 2024-2025 تحتوي على `fiscal_year_id = NULL`. هذا يعني:
- لا تظهر للمستفيدين عند فلترة السنة المالية
- لا ترتبط بالبيانات المالية بشكل صحيح
- قد تختفي من التقارير والإفصاحات

**السبب**: عند تنفيذ التوزيع، لم يتم تمرير معرف السنة المالية (fiscalYearId) من الواجهة إلى الدالة.

### 2. فرق تقريب (0.75 ر.س)
المبلغ المتاح = 995,000.78 ر.س، لكن مجموع التوزيعات = 995,000.03 ر.س. الفرق ناتج عن تقريب كل حصة فردية (14 مستفيد * ~0.05 فرق = ~0.75).

---

## خطة الإصلاح

### الخطوة 1: إصلاح البيانات الحالية
تحديث التوزيعات الـ 14 لربطها بالسنة المالية 2024-2025:
```text
UPDATE distributions
SET fiscal_year_id = '1fe1394b-a04c-4223-8f70-0e5fee905d23'
WHERE account_id = 'c21b1de2-659e-414e-b74c-f98ef3c46fda'
  AND fiscal_year_id IS NULL;
```

### الخطوة 2: إصلاح دالة التوزيع (execute_distribution)
تعديل دالة RPC لترفض التنفيذ إذا لم يتم تمرير `p_fiscal_year_id`:
```text
IF p_fiscal_year_id IS NULL THEN
  RAISE EXCEPTION 'معرف السنة المالية مطلوب لتنفيذ التوزيع';
END IF;
```

### الخطوة 3: إصلاح واجهة AccountsBeneficiariesTable
التأكد من أن `fiscalYearId` يتم تمريره دائماً لمكون `DistributeDialog`، ومنع فتح نافذة التوزيع إذا كانت السنة المالية 'all' أو غير محددة.

### الخطوة 4: إصلاح حارس التكرار (Idempotency Guard)
الشرط الحالي في `execute_distribution`:
```text
WHERE account_id = p_account_id
  AND (p_fiscal_year_id IS NULL OR fiscal_year_id = p_fiscal_year_id)
```
عندما `p_fiscal_year_id` يكون NULL، الشرط الأول يتحقق دائماً فيتجاهل `fiscal_year_id` — وهذا غير دقيق. بعد فرض عدم قبول NULL في الخطوة 2، يصبح الحارس أكثر دقة تلقائياً.

### الخطوة 5: تحسين دقة التقريب
في DistributeDialog، بدلاً من حساب كل حصة منفردة بالتقريب الافتراضي، يتم تطبيق خوارزمية "أكبر باقي" (Largest Remainder) لضمان أن مجموع الحصص = المبلغ المتاح بالضبط.

---

## ملخص الملفات المتأثرة

| الملف/المورد | التعديل |
|---|---|
| قاعدة البيانات (بيانات) | تحديث fiscal_year_id للتوزيعات الحالية |
| قاعدة البيانات (migration) | إضافة NOT NULL guard في execute_distribution |
| `src/components/accounts/DistributeDialog.tsx` | تحسين خوارزمية التقريب |
| `src/components/accounts/AccountsBeneficiariesTable.tsx` | منع التوزيع بدون سنة مالية محددة |

