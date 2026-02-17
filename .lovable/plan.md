# المرحلة 3 - متابعة الإصلاحات المتبقية

## ما تم إنجازه سابقاً

- تشديد حماية دالة lookup-national-id (Rate Limiting)
- فصل حالة حقول تسجيل الدخول/التسجيل في Auth.tsx
- إضافة React.StrictMode
- تحميل AiAssistant و SecurityGuard بشكل متأخر (lazy)

---

## الإصلاحات المطلوبة الآن

### 1. إصلاح خطأ: AiAssistant و SecurityGuard بدون Suspense

المكونان تم تحويلهما لـ `lazy()` لكنهما يُعرضان خارج `<Suspense>` (سطر 261-262 في App.tsx)، مما يسبب خطأ في وقت التشغيل.

**الحل**: لفهما بـ `<Suspense fallback={null}>` لأنهما مكونات مساعدة لا تحتاج مؤشر تحميل.

### 2. تحسين أمان دالة admin-manage-users

- استخدام `getClaims()` بدل `getUser()` للتحقق من الهوية (أسرع وأخف)
- إضافة تحقق من صحة `action` قبل معالجة الطلب

### 3. تحسين أمان دالة ai-assistant

- استخدام CORS المشترك من `_shared/cors.ts` بدل تعريفها محلياً
- استخدام `getClaims()` بدل `getUser()`

### 4. تحسين أمان دالة auto-expire-contracts

- تقوية التحقق من service_role (مقارنة الرمز الحالية غير آمنة لأن مقارنة النص العادي قد تكون عرضة لهجمات التوقيت)

### 5. تفعيل Realtime للإشعارات (تصحيح)

عند الفحص تبين أن Realtime **مفعل بالفعل** في:

- `useNotifications.ts` - اشتراك INSERT
- `useMessaging.ts` - اشتراك للمحادثات والرسائل

لكن يجب التأكد من تفعيل جدول notifications في Realtime Publication عبر migration.

---

## التفاصيل التقنية

### App.tsx - إصلاح Suspense

```tsx
// قبل
<AiAssistant />
<SecurityGuard />

// بعد
<Suspense fallback={null}>
  <AiAssistant />
  <SecurityGuard />
</Suspense>
```

### admin-manage-users - getClaims + action validation

- استبدال `getUser()` بـ `getClaims()` للأداء
- إضافة قائمة بيضاء للـ actions المسموحة
- إبقاء التحقق من دور admin كما هو

### ai-assistant - توحيد CORS + getClaims

- استيراد `corsHeaders` من `_shared/cors.ts`
- استبدال `getUser()` بـ `getClaims()`

### auto-expire-contracts - تحسين مقارنة service_role

- استخدام getClaims للمستخدمين العاديين
- الإبقاء على مقارنة service_role للمهام المجدولة مع تحسين أمان المقارنة

### Migration - تفعيل Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

---

## ملخص التغييرات


| الملف                                             | نوع التغيير                   |
| ------------------------------------------------- | ----------------------------- |
| src/App.tsx                                       | إصلاح Suspense                |
| supabase/functions/admin-manage-users/index.ts    | getClaims + action validation |
| supabase/functions/ai-assistant/index.ts          | توحيد CORS + getClaims        |
| supabase/functions/auto-expire-contracts/index.ts | تحسين أمان المقارنة           |
| Migration SQL                                     | تفعيل Realtime للإشعارات      |
