## الهدف
تفكيك `useWebAuthnManage` (115 سطر) إلى طبقتَين متوافقتَين مع `Hooks Layering`: طبقة بيانات صرفة + طبقة عرض (toast) — مع الحفاظ الكامل على API العام لـ `useWebAuthn` كي لا يتأثر أي مستهلك خارجي.

## النطاق المعزول
- **يُعدَّل**: `src/hooks/auth/biometric/useWebAuthnManage.ts` (يصبح غلافاً رفيعاً للتوافق)
- **يُنشَأ**: `src/hooks/data/auth/useWebAuthnCredentials.ts` (قراءة/كتابة Supabase + storage فقط)
- **لا يُمَس**: `useWebAuthn.ts`، `useWebAuthnAuth.ts`، `useWebAuthnRegister.ts`، `AuthContext.tsx`، `ProtectedRoute.tsx`، Edge Functions، أي مكوّن UI

## بنية ما بعد التفكيك

```text
hooks/data/auth/useWebAuthnCredentials.ts   ← Supabase + storage فقط (بدون toast)
  ├─ isSupported, isEnabled, credentials state
  ├─ initial mount effect (DB sync)
  ├─ fetchCredentials() → returns {ok, data, error}
  └─ deleteCredential(id) → returns {ok, error}

hooks/auth/biometric/useWebAuthnManage.ts   ← غلاف توافق (Domain/UI layer)
  ├─ يستهلك useWebAuthnCredentials
  ├─ يضيف toast العربية على نجاح/فشل
  └─ يحافظ على نفس التوقيع المُصدَّر حرفياً
```

التوقيع المُصدَّر `useWebAuthnManage()` يبقى **مطابقاً 100%** للحالي:
`{ isSupported, isEnabled, isLoading, credentials, setIsLoading, setIsEnabled, fetchCredentials, removeCredential }`

## الخطوات
1. إنشاء `src/hooks/data/auth/useWebAuthnCredentials.ts` ينقل:
   - استدعاءات `supabase.from('webauthn_credentials')` (select/delete)
   - استدعاءات `supabase.auth.getUser()`
   - تأثيرات `safeGet/safeSet/safeRemove` على `BIOMETRIC_ENABLED_KEY`
   - حالات `isSupported / isEnabled / credentials`
   - **بدون** أي `uiNotify` أو `logger.error` لرسائل المستخدم
2. إعادة كتابة `useWebAuthnManage.ts` كغلاف ≤60 سطراً يستدعي `useWebAuthnCredentials` ويضيف `uiNotify.success/error` فقط
3. تحديث `useWebAuthn.test.ts` (إن لزم) — التحقق من بقاء جميع الاختبارات خضراء دون تعديل ثوابتها
4. تحديث `mem://technical/architecture/hooks-auth-subfolder-layout` بفقرة قصيرة تشير إلى طبقة `hooks/data/auth/`

## خطة الاختبار اليدوي الصارمة (إلزامية)

بعد التنفيذ، يجب على المستخدم تنفيذ هذه السيناريوهات بالترتيب على متصفّح يدعم WebAuthn (Chrome/Safari + Touch ID / Windows Hello):

| # | السيناريو | الخطوات | النتيجة المتوقعة |
|---|-----------|---------|------------------|
| 1 | تسجيل دخول عادي | `/auth` → بريد + كلمة مرور | دخول ناجح، لا أخطاء console |
| 2 | تسجيل بصمة جديدة | الإعدادات → الأمان → تفعيل البصمة | prompt بيومتري → toast "تم تسجيل البصمة" → الزر يصبح "إلغاء التفعيل" |
| 3 | تحديث الصفحة بعد التسجيل | F5 | `isEnabled=true` تلقائياً، البصمة المسجّلة تظهر في القائمة |
| 4 | تسجيل خروج ثم دخول بالبصمة | خروج → `/auth` → زر "دخول بالبصمة" | prompt → دخول ناجح بدون كلمة مرور |
| 5 | حذف بصمة | الإعدادات → حذف البصمة | toast "تم حذف البصمة بنجاح" → القائمة فارغة → `isEnabled=false` |
| 6 | إلغاء البصمة منتصف العملية | بدء تسجيل ثم Cancel على prompt | toast خطأ عربي مفهوم، لا crash، الحالة تعود |
| 7 | متصفح بدون دعم WebAuthn | فتح في متصفح قديم/خاص | `isSupported=false`، الأزرار مخفية |
| 8 | حذف بصمة بدون تسجيل دخول | فتح صفحة محمية بعد انتهاء الجلسة | toast "يجب تسجيل الدخول أولاً" |

**معيار النجاح**: 8/8 سيناريوهات تمر بدون regression.

## بروتوكول الإصلاح إذا انكسر تسجيل الدخول

عند فشل أي سيناريو من 1–8:
1. **التشخيص الفوري** عبر `code--read_console_logs` + `supabase--edge_function_logs` للوظائف `webauthn-*`
2. **مقارنة diff**: قراءة `useWebAuthnManage.ts` الجديد والقديم (من git history) سطراً سطراً
3. **الإصلاح الموضعي**: تعديل الغلاف فقط — لا تعديل لـ Auth/Register/Edge Functions
4. **إذا فشل الإصلاح خلال محاولتَين**: rollback فوري — إعادة `useWebAuthnManage.ts` لحالته الأصلية (115 سطر) وحذف `useWebAuthnCredentials.ts` الجديد، مع تقرير الفشل

## ضمانات عدم المساس
- **API ثابت**: نفس الأسماء، نفس الترتيب، نفس الأنواع المُصدَّرة
- **سلوك ثابت**: نفس استدعاءات Supabase بنفس الترتيب، نفس مفاتيح storage، نفس رسائل toast العربية
- **لا تعديل** على: AuthContext, ProtectedRoute, SecurityGuard, Edge Functions, config.toml, types.ts, client.ts, .env
- **لا تعديل** على ملفات اختبار موجودة إلا للتأكد من اجتيازها — أي تغيير في توقعات الاختبار = توقّف وإبلاغ

## مخاطر متبقية
- اختبارات `useWebAuthn.test.ts` (404 سطر) قد تحتوي mocks لاستيرادات داخلية محدّدة. سأحافظ على نفس مسارات الاستيراد قدر الإمكان، وإن لزم تعديل mock فسأذكره صراحة قبل التطبيق.
- لا يمكنني اختبار البصمة فعلياً من السطر؛ الاختبار اليدوي مسؤولية المستخدم.
