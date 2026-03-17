

# فحص أمني هجين شامل — التقرير وخطة الإصلاح

## نتائج الفحص

### 1. [حرج] جميع الجداول (36 جدولاً) تمنح صلاحيات كاملة لدور `anon`

**المشكلة:** كل جدول في المخطط العام يمنح `anon` صلاحيات INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER. رغم أن سياسات RLS تحظر معظم العمليات (لأن `auth.uid()` يعيد NULL للمجهولين)، هذا يخالف مبدأ **الدفاع العميق** ويزيد سطح الهجوم.

**الإصلاح:** تنفيذ migration واحد يسحب كافة صلاحيات `anon` من جميع الجداول، ثم يعيد منح `SELECT` فقط لـ `app_settings` (مطلوب لفحص `registration_enabled` في بوابة التسجيل العامة).

```sql
-- سحب شامل
DO $$ 
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- إعادة منح محدود
GRANT SELECT ON public.app_settings TO anon;
```

### 2. [متوسط] دوال مكشوفة لدور `anon`

**المشكلة:** 4 دوال قابلة للتنفيذ من `anon`:
- `has_role` — دالة مساعدة، لا ضرر (تعيد false للمجهولين)
- `is_fiscal_year_accessible` — مساعدة، لا ضرر
- `get_public_stats` — مقصودة للصفحة العامة ✓
- `log_access_event` — **خطر**: يمكن للمجهول ملء جدول السجلات

**الإصلاح:** سحب EXECUTE من `anon` لـ `has_role`, `is_fiscal_year_accessible`, و `log_access_event`. إبقاء `get_public_stats` فقط.

### 3. [إ