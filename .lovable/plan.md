

# إصلاح: عدد الفواتير ناقص (9 بدل 12)

## السبب الجذري

تم التحقق من البيانات الفعلية في قاعدة البيانات. المشكلة واضحة:

```text
السنة المالية 2025-2026: من 2025-10-25 إلى 2026-10-24

مثال: عقد مروان حسن (بداية: 2025-12-31 → نهاية: 2026-12-30، شهري، 12 دفعة)

الدفعة   تاريخ الاستحقاق   السنة المالية    الحالة
──────  ────────────────  ──────────────  ──────
  1     2026-01-31        2025-2026       ✅ تظهر
  2     2026-02-28        2025-2026       ✅ تظهر
  ...
  9     2026-09-30        2025-2026       ✅ تظهر
 10     2026-10-31        NULL            ❌ مفقودة
 11     2026-11-30        NULL            ❌ مفقودة
 12     2026-12-30        NULL            ❌ مفقودة
```

**السبب**: دالة `generate_contract_invoices` تبحث عن السنة المالية لكل فاتورة بناءً على `due_date`:
```sql
SELECT id INTO v_fy FROM fiscal_years
WHERE v_due_date >= start_date AND v_due_date <= end_date
```

الدفعات 10-12 تاريخ استحقاقها بعد نهاية السنة المالية (2026-10-24)، ولا توجد سنة مالية تالية بعد، فتحصل على `fiscal_year_id = NULL` → لا تظهر عند الفلترة بالسنة المالية.

## الحل

تعديل دالة `generate_contract_invoices` لاستخدام `fiscal_year_id` من العقد نفسه كبديل عند عدم وجود سنة مالية مطابقة:

```sql
-- بعد البحث عن السنة المالية بالتاريخ:
SELECT id INTO v_fy FROM fiscal_years
WHERE v_due_date >= start_date AND v_due_date <= end_date
ORDER BY start_date LIMIT 1;

-- إذا لم يُعثر على سنة مالية، نستخدم السنة المالية للعقد
IF v_fy.id IS NULL THEN
  v_fy.id := v_contract.fiscal_year_id;
END IF;
```

هذا يضمن أن جميع فواتير العقد (12 من 12) مربوطة بسنة مالية وتظهر في الواجهة.

### بعد تعديل الدالة: تحديث الفواتير الحالية

```sql
-- تصحيح الفواتير الحالية التي لديها fiscal_year_id = NULL
UPDATE payment_invoices pi
SET fiscal_year_id = c.fiscal_year_id
FROM contracts c
WHERE pi.contract_id = c.id
  AND pi.fiscal_year_id IS NULL
  AND c.fiscal_year_id IS NOT NULL;
```

## الملفات المتأثرة
```text
supabase/migrations/[new].sql  ← تعديل generate_contract_invoices + تصحيح البيانات
```

تعديل محدود: إضافة 3 أسطر fallback في الدالة + تصحيح البيانات الحالية.

