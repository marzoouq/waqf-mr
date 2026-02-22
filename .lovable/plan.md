

# اصلاح صفحة ادارة المستخدمين في بيئة الانتاج

## المشكلة
صفحة ادارة المستخدمين فارغة في الانتاج لان توكن المصادقة لا يُرسل مع طلبات الوظيفة الخلفية.

## الدليل من سجلات الانتاج
سجلات الوظيفة الخلفية تظهر بوضوح:
- `Auth header present: false, length: 0`
- `REJECTED: No valid authorization header`

بينما الطلبات من بيئة التطوير تعمل بشكل صحيح (`Auth header present: true, length: 937`).

## السبب الجذري
دالة `callAdminApi` في سطر 31 تستدعي `supabase.functions.invoke` بدون تمرير التوكن صراحة في الـ headers. الـ SDK في بعض الحالات (خصوصا في الانتاج) لا يرفق التوكن تلقائيا.

## الحل
تعديل واحد في ملف `src/pages/dashboard/UserManagementPage.tsx`:

تغيير السطر 31 من:
```typescript
const res = await supabase.functions.invoke('admin-manage-users', { body });
```

الى:
```typescript
const res = await supabase.functions.invoke('admin-manage-users', {
  body,
  headers: { Authorization: `Bearer ${session.access_token}` },
});
```

## لماذا هذا كافي؟
- CORS: سليم ومُعد بشكل صحيح (يقبل `waqf-mr.lovable.app`)
- الوظيفة الخلفية: تعمل بشكل صحيح (تصادق وتجلب البيانات عند وصول التوكن)
- البيانات: موجودة (15 مستخدم و14 مستفيد في الانتاج)
- التوكن متاح في `session.access_token` (السطر 30 يتحقق منه اصلا)

الحل يضمن ارسال التوكن بشكل صريح مع كل طلب بغض النظر عن سلوك SDK.

