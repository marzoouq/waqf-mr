## السبب الجذري

ترقية `@supabase/supabase-js` (الإصدار 2.95+) و `@simplewebauthn/types@11` جعلت الأنواع أكثر صرامة:
- `.from()` ترجع `PostgrestFilterBuilder` (Thenable) بدلاً من Promise كاملة → غير متوافقة مع توقيع `Promise<T>`.
- `createClient` بدون `Database` generic يجعل أعمدة الجداول تُعتبر `never`.
- `.catch()` غير مدعوم على QueryBuilder.
- في `@simplewebauthn/types@11` صار `regCred.id` نص `Base64URLString` (لا `Uint8Array`)، وكذلك `credential.id` في `verifyAuthenticationResponse`.

## الملفات المتأثرة (4 ملفات بأخطاء فعلية)

| الملف | عدد الأخطاء |
|---|---|
| `supabase/functions/_shared/ai-data-fetcher.ts` | 6 |
| `supabase/functions/process-email-queue/index.ts` | 7 |
| `supabase/functions/zatca-onboard/index.ts` | 2 |
| `supabase/functions/webauthn/index.ts` | 2 |

> ملاحظة: `auth-email-hook/index.ts` و `zatca-onboard/index.test.ts` تظهران كـ "Check" فقط دون أخطاء فعلية — تم فحصهما ولا تحتاجان تعديل.

## الإصلاحات

### 1. `_shared/ai-data-fetcher.ts`
- تغليف QueryBuilders داخل `Promise.all` بـ `Promise.resolve(qb)` لتطبيع النوع إلى `Promise`.
- تحويل `.catch(() => fallback)` على RPCs إلى نمط `.then(r => r, () => fallback)` (السطور 174, 186).
- توحيد توقيع `batch2Promises` ليقبل `Thenable<PromiseResult>` أو استخدام `Promise.resolve(...)` لكل عنصر.

### 2. `process-email-queue/index.ts`
- استيراد `SupabaseClient` وتعريف `type AnyClient = SupabaseClient<any, any, any, any, any>`.
- تمرير `<any>` إلى `createClient<any>(supabaseUrl, supabaseServiceKey)` لمنع `never` على الجداول.
- توقيع `moveToDlq(supabase: AnyClient, ...)` بدل النوع الصارم المُستنتج.
- إضافة نوع صريح `(msg: QueueMessage) =>` و `(id: string | null): id is string =>`.

### 3. `zatca-onboard/index.ts`
- إضافة توقيع صريح للمعالج: `Deno.serve(async (req): Promise<Response> => { ... })` لإجبار TS على التحقق من اكتمال المسارات.
- استبدال `.catch(() => {})` على QueryBuilder (سطر 119) بـ:
  ```ts
  const clearOtp = async () => {
    try { await admin.from("app_settings").delete().in("key", ["zatca_otp_1", "zatca_otp_2"]); } catch { /* ignore */ }
  };
  ```

### 4. `webauthn/index.ts`
- سطر 167: `regCred.id` نص base64 جاهز — استخدمه مباشرة `const credIdBase64 = regCred.id;`.
- سطر 284: تمرير `id: storedCred.credential_id` (نص base64) بدلاً من `credIdBytes`.
- إزالة سطر 276 `credIdBytes` غير المستخدم بعد التعديل.

## خطوات التنفيذ

1. تعديل `process-email-queue/index.ts` (createClient generic + types).
2. تعديل `_shared/ai-data-fetcher.ts` (Promise wrappers + catch→then).
3. تعديل `zatca-onboard/index.ts` (return type + clearOtp wrapper).
4. تعديل `webauthn/index.ts` (string IDs).
5. تشغيل `bunx tsc --noEmit` للواجهة، ثم نشر `process-email-queue` و `zatca-onboard` و `webauthn` و `ai-assistant` للتحقق من نجاح Deno type-check.

## ضمانات
- لا تغييرات في منطق الأعمال — فقط type annotations وتعديلات API بسيطة.
- لا مساس بـ `AuthContext`/`config.toml`/`client.ts`/`types.ts`.
- بعد التنفيذ تنجح عمليات النشر بدون أخطاء type-check.
