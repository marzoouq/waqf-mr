
# إصلاح الأرقام الإحصائية في الصفحة الرئيسية

## المشكلة
الأرقام تظهر "0" لأن الصفحة الرئيسية عامة (لا تتطلب تسجيل دخول)، بينما سياسات حماية البيانات (RLS) على جداول `properties` و`beneficiaries` و`fiscal_years` تشترط أن يكون المستخدم مسجلاً بدور معين (admin/beneficiary/waqif).

## الحل المقترح
إنشاء دالة قاعدة بيانات (Database Function) تعمل بصلاحيات مرتفعة (`SECURITY DEFINER`) لتُرجع الأعداد فقط دون كشف أي بيانات حساسة، ثم استدعاؤها من الصفحة الرئيسية.

## خطوات التنفيذ

### 1. إنشاء دالة قاعدة بيانات
- إنشاء دالة `get_public_stats()` من نوع `SECURITY DEFINER` تُرجع عدد العقارات والمستفيدين والسنوات المالية فقط.
- هذا آمن لأن الدالة تُرجع أرقاماً فقط وليس بيانات تفصيلية.

### 2. تعديل `src/pages/Index.tsx`
- استبدال استعلامات `supabase.from(...)` بنداء واحد لـ `supabase.rpc('get_public_stats')`.
- عرض الأرقام المُرجعة مباشرة.

---

### تفاصيل تقنية

**دالة SQL:**
```text
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'properties', (SELECT count(*) FROM public.properties),
    'beneficiaries', (SELECT count(*) FROM public.beneficiaries),
    'fiscal_years', (SELECT count(*) FROM public.fiscal_years)
  );
END;
$$;
```

**تعديل Index.tsx:**
- استبدال 3 استعلامات منفصلة باستدعاء `supabase.rpc('get_public_stats')` واحد.
- معالجة الخطأ بعرض "٠" كقيمة افتراضية.

## النتيجة المتوقعة
- صفحة 404: تعمل بشكل ممتاز (تم التحقق - النص بالعربية).
- الصفحة الرئيسية: ستعرض الأرقام الفعلية (5 عقارات، 14 مستفيد، 2 تقرير) حتى للزوار غير المسجلين.
