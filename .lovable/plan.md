

# إصلاح نتائج الفحص الجنائي — الجولة الثانية

## تصحيحات على التقرير (مشاكل غير موجودة فعلاً)

| المشكلة المُبلّغة | الحالة الفعلية |
|---|---|
| CRITICAL-1: `check-contract-expiry` بدون auth guard | ✅ **مُصلح بالفعل** — سطر 37-73 يتحقق من `isServiceRole`، وإذا false يتحقق من JWT + دور admin، ويرجع 401/403 |
| ISSUE-8: `abortControllerRef` لا يُلغى عند الإغلاق | ✅ **مُصلح بالفعل** — `useEffect(() => () => abortControllerRef.current?.abort(), [])` موجود بسطر 43-45 |
| ISSUE-9: `useBfcacheSafeChannel` race condition | ✅ **صحيح** — `channelName` في dependency array |
| QUALITY-5: `auth-email-hook` بدون HMAC | ✅ **محمي بالفعل** — يستخدم `verifyWebhookRequest` مع HMAC signature |
| CRITICAL-2: migrations متضاربة | ✅ **آخر migration يسري** — الترتيب الزمني يضمن أن `REVOKE` هو النهائي |

## التغييرات المطلوبة فعلاً (4 إصلاحات)

### 1. ISSUE-6: إضافة `clearPageLoadEntries()` عند تسجيل الخروج
- **الملف**: `src/contexts/AuthContext.tsx`
- إضافة `import { clearPageLoadEntries } from '@/lib/pagePerformanceTracker'`
- استدعاء `clearPageLoadEntries()` في دالة `signOut()` بجانب `clearSlowQueries()` و `clearToasts()`

### 2. ISSUE-5: فحص تعقيد كلمة المرور في `guard-signup`
- **الملف**: `supabase/functions/guard-signup/index.ts`
- إضافة فحص بعد التحقق من الطول:
```typescript
const hasUpperOrDigit = /(?=.*[A-Z])|(?=.*\d)/.test(password);
if (!hasUpperOrDigit) {
  return error("كلمة المرور يجب أن تحتوي على حرف كبير أو رقم على الأقل");
}
```

### 3. QUALITY-2: إخفاء `[data-sensitive]` عند الطباعة
- **الملف**: `src/index.css`
- إضافة داخل `@media print` الموجود:
```css
[data-sensitive] {
  visibility: hidden !important;
}
```

### 4. QUALITY-1: تصحيح التوثيق
- **الملف**: `docs/API.md` سطر 377
- تغيير "بين 6 و 128" إلى "بين 8 و 128"

## ملاحظات إضافية
- **QUALITY-3** (`pg_stat_statements`): تحسين دفاعي لكن الـ extension مفعلة في Supabase Cloud افتراضياً — خطر منخفض جداً
- **QUALITY-6** (`detectSessionInUrl`): لا يمكن تعطيلها بشكل عملي في Supabase — الـ fragment لا يُرسل للخادم أصلاً

