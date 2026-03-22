

# خطة إصلاح بيانات التوزيعات + تحذير الأمان

---

## الحالة الحالية في الإنتاج (مؤكدة الآن)

| البند | الحالة |
|-------|--------|
| Trigger `trg_set_distribution_fiscal_year` | ✅ موجود ومطبّق |
| Function `set_distribution_fiscal_year` | ✅ موجودة (بدون `SET search_path`) |
| **14 سجل توزيع — `fiscal_year_id`** | ❌ **لا يزال NULL** |
| السنة المنشورة `2024-2025` | `published=true`, `id=1fe1394b...` |

**السبب:** الملفان الحاليان يحتويان فقط على إنشاء الـ Trigger وتحديث الدالة — **لا يحتويان على `UPDATE`** لتصحيح البيانات.

**خطأ النشر:** "Circuit breaker open" — مشكلة اتصال مؤقتة بالبنية التحتية، الملف الثاني لم يُطبَّق بعد.

---

## الإصلاح المطلوب

### 1. إضافة migration جديدة تحتوي على:

```sql
-- M-01: تصحيح البيانات — ربط fiscal_year_id من accounts
UPDATE distributions d
SET fiscal_year_id = a.fiscal_year_id
FROM accounts a
WHERE d.account_id = a.id
  AND d.fiscal_year_id IS NULL;

-- Security Fix: إضافة accountant في سياسة SELECT للتوزيعات
-- (التحذير الأمني: المحاسب يستطيع INSERT/UPDATE/DELETE لكن لا يستطيع SELECT)
DROP POLICY IF EXISTS "Users can view their own distributions" ON distributions;
CREATE POLICY "Users can view their own distributions"
  ON distributions FOR SELECT TO authenticated
  USING (
    beneficiary_id IN (SELECT id FROM beneficiaries WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'waqif')
    OR has_role(auth.uid(), 'accountant')
  );
```

### 2. لا تغييرات في الكود الأمامي

المشكلة محصورة في البيانات وسياسات RLS.

---

## النتيجة المتوقعة

| قبل | بعد |
|-----|-----|
| 14 سجل بـ `fiscal_year_id = NULL` | جميعها مرتبطة بـ `1fe1394b...` |
| `is_fiscal_year_accessible(NULL) → false` | `is_fiscal_year_accessible('1fe1394b...') → true` (منشورة) |
| بطاقات المستفيد فارغة | تعرض المبالغ المستلمة |
| المحاسب لا يرى التوزيعات | يراها بالكامل |

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| Migration SQL جديدة | UPDATE بيانات + إصلاح سياسة SELECT |

