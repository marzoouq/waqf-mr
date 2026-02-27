

# خطة إصلاح وصول المستفيدين للبيانات

## المشكلة الرئيسية
المستفيدون لا يرون أي بيانات في جميع صفحات لوحتهم بسبب أن كلتا السنتين الماليتين غير منشورتين (`published = false`). نظام RLS يحجب البيانات تلقائياً عن غير المشرفين عبر دالة `is_fiscal_year_accessible`.

## الحل (Migration واحد)

### 1. نشر وإقفال السنة المالية 2024-2025
تغيير حالة السنة 2024-2025 إلى `closed` مع تفعيل النشر (`published = true`) حتى يتمكن المستفيدون من رؤية التوزيعات والبيانات المسجلة.

### 2. إبقاء 2025-2026 كسنة نشطة وحيدة
بدون نشر (لأنها لا تحتوي على بيانات بعد).

### 3. إضافة Trigger لمنع وجود أكثر من سنة مالية نشطة
عند تفعيل سنة جديدة، يتم إقفال السنوات النشطة السابقة تلقائياً.

## التفاصيل التقنية

### Migration SQL
```text
-- 1. نشر وإقفال السنة 2024-2025
UPDATE fiscal_years
SET status = 'closed', published = true
WHERE id = '1fe1394b-a04c-4223-8f70-0e5fee905d23';

-- 2. Trigger لمنع سنتين نشطتين
CREATE OR REPLACE FUNCTION enforce_single_active_fy()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE fiscal_years SET status = 'closed'
    WHERE status = 'active' AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

CREATE TRIGGER trg_single_active_fy
BEFORE INSERT OR UPDATE ON fiscal_years
FOR EACH ROW EXECUTE FUNCTION enforce_single_active_fy();
```

## النتيجة المتوقعة
- المستفيدون يرون بيانات 2024-2025 (التوزيعات، الإفصاح، التقارير، الحسابات)
- السنة 2025-2026 تبقى نشطة وغير منشورة (حتى يقرر الناظر نشرها لاحقاً)
- لن يمكن تنشيط سنتين ماليتين في نفس الوقت مستقبلاً

## الملفات المتأثرة
لا توجد تعديلات على ملفات الكود -- فقط migration في قاعدة البيانات. جميع صفحات لوحة المستفيد (الرئيسية، حصتي، الإفصاح، التقارير، الحسابات) ستعمل تلقائياً بمجرد نشر السنة المالية.

