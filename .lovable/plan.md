

# تشخيص وإصلاح مشكلة صفحة المستخدمين الفارغة

## التحليل

بعد فحص الكود والسجلات، المشكلة تتمحور حول نقطتين:

### المشكلة 1: تعارض محتمل في إرسال header المصادقة
في ملف `UserManagementPage.tsx` (سطر 28-37)، الكود يرسل header المصادقة يدوياً:
```text
headers: { Authorization: `Bearer ${session?.access_token}` }
```
لكن مكتبة `supabase.functions.invoke` ترسل هذا الـ header **تلقائياً** من الجلسة الحالية. التعيين اليدوي قد يتعارض مع الآلية التلقائية في بعض إصدارات المكتبة.

### المشكلة 2: عدم وجود سجلات تشخيصية في الوظيفة
سجلات الوظيفة تُظهر فقط `booted` و `shutdown` بدون أي معلومات عن الطلبات الفعلية، مما يجعل التشخيص مستحيلاً.

## خطة الإصلاح

### الخطوة 1: إضافة سجلات تشخيصية للوظيفة

تعديل `supabase/functions/admin-manage-users/index.ts`:
- إضافة `console.log` عند استقبال كل طلب لعرض:
  - نوع الطلب (method)
  - هل يوجد Authorization header أم لا
  - طول الـ header (بدون كشف محتواه)
- إضافة `console.log` عند نجاح/فشل التحقق من المستخدم
- هذا سيظهر في سجلات الوظيفة ويساعد في التشخيص الفوري

### الخطوة 2: إزالة التعيين اليدوي لـ header المصادقة

تعديل `src/pages/dashboard/UserManagementPage.tsx`:
- إزالة `headers: { Authorization: ... }` من `callAdminApi`
- الاعتماد على الإرسال التلقائي من `supabase.functions.invoke`
- إضافة تحقق من وجود الجلسة قبل الاستدعاء مع رسالة خطأ واضحة

```text
قبل:
  const res = await supabase.functions.invoke('admin-manage-users', {
    body,
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });

بعد:
  if (!session?.access_token) throw new Error("يجب تسجيل الدخول أولاً");
  const res = await supabase.functions.invoke('admin-manage-users', { body });
```

### الخطوة 3: إعادة نشر الوظيفة واختبارها

- نشر الوظيفة المحدثة
- استدعاء الوظيفة مباشرة للتحقق من عملها
- فحص السجلات التشخيصية الجديدة

## الملفات المتأثرة

1. `supabase/functions/admin-manage-users/index.ts` -- إضافة سجلات تشخيصية
2. `src/pages/dashboard/UserManagementPage.tsx` -- إزالة التعيين اليدوي للـ header

## النتيجة المتوقعة

- سجلات واضحة تكشف بالضبط ما يحدث مع كل طلب
- إصلاح التعارض المحتمل في إرسال header المصادقة
- صفحة المستخدمين تعرض القائمة بشكل صحيح

