

# إصلاح تناقض أرقام الإشغال - عقار 102

## تحليل المشكلة

عقار **102** يحتوي على 9 وحدات. البطاقة تعرض **4 شاغرة** بينما المتوقع **3 شاغرة**.

### السبب الجذري

وحدة **"محل شاورما"** حالتها في جدول الوحدات = "مؤجرة"، لكن عقدها الوحيد (`10704863701`) منتهي من السنة المالية السابقة ولم يُجدد في السنة الحالية.

| الوحدة | حالة الوحدة | عقد نشط؟ | النتيجة في البطاقة |
|--------|-----------|----------|-------------------|
| شقة 1-4, 8 | مؤجرة | نعم | مؤجرة (صحيح) |
| شقة 5, 6, 7 | شاغرة | لا | شاغرة (صحيح) |
| محل شاورما | مؤجرة | **لا** | **شاغرة** (تناقض) |

النظام يعتمد على العقود النشطة (وهو المنطق الصحيح)، لكن حالة الوحدة لم تُحدث تلقائياً عند انتهاء العقد.

## الحل المقترح

### 1. مزامنة تلقائية لحالة الوحدات مع العقود

إنشاء دالة قاعدة بيانات تُحدث حالة الوحدة تلقائياً عند:
- إنشاء عقد جديد مرتبط بوحدة = تحويل الحالة إلى "مؤجرة"
- انتهاء/إلغاء عقد = التحقق من وجود عقد نشط آخر، وإلا تحويل الحالة إلى "شاغرة"

### 2. إضافة تنبيه مرئي للتناقضات

في بطاقة العقار، إذا وُجدت وحدة حالتها "مؤجرة" بدون عقد نشط (أو العكس)، يظهر تنبيه بسيط يوجه الناظر لمراجعة الحالة.

### 3. إصلاح فوري للبيانات الحالية

تحديث حالة "محل شاورما" إلى "شاغرة" لمطابقة واقع العقود.

## التفاصيل التقنية

### Migration SQL

```sql
-- إصلاح البيانات: تحديث حالة محل شاورما
UPDATE units SET status = 'شاغرة'
WHERE id = '648c5c71-090f-4c12-9df0-09e15dee7f54'
  AND NOT EXISTS (
    SELECT 1 FROM contracts
    WHERE unit_id = '648c5c71-090f-4c12-9df0-09e15dee7f54'
      AND status = 'active'
  );

-- دالة مزامنة حالة الوحدة تلقائياً عند تغيير العقود
CREATE OR REPLACE FUNCTION public.sync_unit_status_on_contract_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_unit_id uuid;
  has_active boolean;
BEGIN
  -- تحديد الوحدة المتأثرة
  IF TG_OP = 'DELETE' THEN
    target_unit_id := OLD.unit_id;
  ELSE
    target_unit_id := NEW.unit_id;
    -- إذا تغيرت الوحدة في UPDATE، نعالج الوحدة القديمة أيضاً
    IF TG_OP = 'UPDATE' AND OLD.unit_id IS DISTINCT FROM NEW.unit_id AND OLD.unit_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM contracts WHERE unit_id = OLD.unit_id AND status = 'active'
      ) INTO has_active;
      IF NOT has_active THEN
        UPDATE units SET status = 'شاغرة' WHERE id = OLD.unit_id AND status = 'مؤجرة';
      END IF;
    END IF;
  END IF;

  IF target_unit_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- التحقق من وجود عقد نشط للوحدة
  SELECT EXISTS (
    SELECT 1 FROM contracts WHERE unit_id = target_unit_id AND status = 'active'
  ) INTO has_active;

  IF has_active THEN
    UPDATE units SET status = 'مؤجرة' WHERE id = target_unit_id AND status != 'صيانة';
  ELSE
    UPDATE units SET status = 'شاغرة' WHERE id = target_unit_id AND status = 'مؤجرة';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ربط الدالة بجدول العقود
CREATE TRIGGER sync_unit_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION sync_unit_status_on_contract_change();
```

### تعديل `src/pages/dashboard/PropertiesPage.tsx`

إضافة تنبيه بسيط في بطاقة العقار عند وجود تناقض بين حالة الوحدة والعقود:

```typescript
// بعد حساب rented و vacant
const statusMismatch = propertyUnits.filter(u =>
  (u.status === 'مؤجرة' && !rentedUnitIdsForProp.has(u.id) && !hasWholePropertyContract) ||
  (u.status === 'شاغرة' && rentedUnitIdsForProp.has(u.id))
).length;
```

إذا كان `statusMismatch > 0`، يُعرض شارة تحذيرية صغيرة بجانب أرقام الإشغال.

### النتيجة المتوقعة

بعد التطبيق:
- محل شاورما تتحول حالته تلقائياً إلى "شاغرة" (لعدم وجود عقد نشط)
- مستقبلاً: عند إضافة أو إلغاء عقد، تتحدث حالة الوحدة تلقائياً
- يظهر تنبيه مرئي إذا وُجد تناقض لأي سبب
