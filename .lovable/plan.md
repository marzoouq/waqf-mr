

# منح الناظر صلاحية تعديل بيانات السنوات المقفلة

## الوضع الحالي

يوجد حماية على مستويين تمنع أي تعديل على بيانات السنوات المالية المقفلة:

| المستوى | الآلية | التأثير |
|---------|--------|---------|
| واجهة المستخدم (UI) | متغير `isClosed` يخفي أزرار التعديل والحذف | الناظر لا يرى خيارات التعديل |
| قاعدة البيانات (Trigger) | دالة `prevent_closed_fiscal_year_modification()` | ترفض أي عملية INSERT/UPDATE/DELETE على جداول مرتبطة بسنة مقفلة |

## الحل المقترح

### 1. تعديل دالة قاعدة البيانات (Database Trigger)

تحديث دالة `prevent_closed_fiscal_year_modification()` لتسمح للمستخدم ذي دور `admin` بتجاوز الحماية، مع الإبقاء على المنع لباقي الأدوار:

```sql
CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fy_status text;
  fy_id uuid;
BEGIN
  -- تحديد معرف السنة المالية
  IF TG_OP = 'DELETE' THEN
    fy_id := OLD.fiscal_year_id;
  ELSE
    fy_id := NEW.fiscal_year_id;
  END IF;

  IF fy_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT status INTO fy_status FROM public.fiscal_years WHERE id = fy_id;

  -- السماح للأدمن بتعديل السنوات المقفلة
  IF fy_status = 'closed' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'لا يمكن تعديل بيانات سنة مالية مقفلة';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
```

### 2. تعديل واجهة المستخدم (3 صفحات)

في كل من صفحات **الدخل** و**المصروفات** و**الحسابات الختامية**:

- ازالة شرط `isClosed` الذي يخفي أزرار التعديل والحذف والاضافة
- استبداله بتنبيه تحذيري واضح يُعلم الناظر أنه يعدّل بيانات سنة مقفلة (بدلاً من المنع التام)
- تغيير رسالة "سنة مقفلة - لا يمكن التعديل" الى "سنة مقفلة - تعديل بصلاحية الناظر"
- اضافة لون تحذيري (برتقالي) بدلاً من اللون الاحمر للتمييز بين المنع والتحذير

### 3. تسجيل العمليات في سجل المراجعة

المشغلات الحالية (`audit_trigger_func`) ستستمر بتسجيل أي تعديل يقوم به الناظر على السنوات المقفلة تلقائياً، مما يوفر تتبعاً كاملاً لأي تغييرات استثنائية.

## ملخص التغييرات

| الملف / المكون | التغيير |
|----------------|---------|
| Migration SQL | تحديث دالة `prevent_closed_fiscal_year_modification` لاستثناء الادمن |
| `IncomePage.tsx` | ابقاء ازرار التعديل مع تحذير بصري |
| `ExpensesPage.tsx` | ابقاء ازرار التعديل مع تحذير بصري |
| `AccountsPage.tsx` | ابقاء ازرار التعديل مع تحذير بصري |

