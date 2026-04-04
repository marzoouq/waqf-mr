

## إصلاح خطأ "permission denied for function jwt_role"

### المشكلة
كل طلبات الشبكة تفشل بخطأ 401 لأن دالة `jwt_role()` لا تملك صلاحيات تنفيذ للأدوار `anon` و `authenticated`.

### الحل
إنشاء migration واحدة تمنح صلاحيات التنفيذ:

```sql
GRANT EXECUTE ON FUNCTION public.jwt_role() TO anon;
GRANT EXECUTE ON FUNCTION public.jwt_role() TO authenticated;
```

### النتيجة المتوقعة
- صفحة تسجيل الدخول تعمل بشكل طبيعي
- التوجيه حسب الدور يعود للعمل
- جميع استعلامات RLS تعود للعمل

### لا تغييرات على
- أي ملف Frontend
- الملفات المحمية (`client.ts`, `types.ts`, `.env`, `config.toml`)

