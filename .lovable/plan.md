# تقرير الفحص الجنائي الشامل — الكود الفعلي الحالي

تم فحص جميع الملفات الحرجة بشكل كامل. النتائج مقسمة إلى: **مشاكل حقيقية تحتاج إصلاح** و**مشاكل وهمية/مُصلحة سابقا**.

---

## المشاكل الحقيقية المتبقية (5 مشاكل)

### 1. (حرج) `create_user` الفردي لا يفحص أخطاء `user_roles` و `beneficiaries`

**الملف:** `supabase/functions/admin-manage-users/index.ts` سطر 224-267

`bulk_create_users` تم إصلاحه بشكل ممتاز (rollback عند الفشل)، لكن `create_user` الفردي لا يزال يتجاهل أخطاء الإدراج:

```text
// سطر 225-228: لا يفحص الخطأ
await adminClient.from("user_roles").insert({
  user_id: newUser.user.id,
  role: body.role,
});
// اذا فشل هنا → المستخدم مُنشأ بدون دور → يعلق في شاشة التحقق
```

نفس المشكلة في `beneficiaries.insert` (سطر 247) و `notify_admins` (سطر 270).

**الإصلاح:** إضافة فحص أخطاء مع rollback مماثل لما تم في `bulk_create_users`.

---

### 2. (حرج) `auto-expire-contracts` يُرجع `error.message` الخام للمتصفح

**الملف:** `supabase/functions/auto-expire-contracts/index.ts` سطر 91-96

```text
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return new Response(JSON.stringify({ error: message }), ...);
}
```

هذا يكشف رسائل أخطاء DB الداخلية. بينما `check-contract-expiry` و `guard-signup` و `ai-assistant` تُرجع رسائل آمنة ("Internal server error" / "خطأ في معالجة الطلب" / "حدث خطأ داخلي").

**الإصلاح:** استبدال `message` برسالة ثابتة آمنة.

---

### 3. (حرج) `bulk_create_users` يسرّب `error.message` الخام في مصفوفة `errors`

**الملف:** `supabase/functions/admin-manage-users/index.ts` سطر 317, 327, 341

```text
errors.push({ email: u.email, error: createError.message });           // سطر 317
errors.push({ email: u.email, error: "فشل تعيين الدور: " + roleError.message }); // سطر 327
errors.push({ email: u.email, error: "فشل إنشاء المستفيد: " + benError.message }); // سطر 341
```

`createError.message` من Supabase Auth API يحتوي على رسائل مثل `"User already registered"` او `"duplicate key..."`. هذه تُرجع مباشرة للناظر عبر الواجهة.

**الإصلاح:** تعقيم رسائل الأخطاء في `errors` array كما تم في الـ catch الرئيسي.

---

### 4. (متوسط) `generate-invoice-pdf` يسرّب أخطاء خام في حالتين

**الملف:** `supabase/functions/generate-invoice-pdf/index.ts`

- سطر 433: `if (fetchError) throw fetchError;` يصل للـ catch الخارجي
- الـ catch الخارجي (سطر ~490) يُرجع الخطأ الخام

**الإصلاح:** إضافة رسالة آمنة في الـ catch.

---

### 5. (طفيف) `create_user` الفردي: `notify_admins` RPC يفشل بصمت بدون `.catch()`

**الملف:** `supabase/functions/admin-manage-users/index.ts` سطر 270-276

في `bulk_create_users` تم إضافة `.catch(() => {})` (سطر 350)، لكن `create_user` الفردي يستدعي `notify_admins` بدون catch — إذا فشل سيُلقى للـ catch الرئيسي ويُرجع خطأ رغم نجاح العملية الأساسية.

**الإصلاح:** إضافة `.catch(() => {})`.

---

## المشاكل الوهمية / المُصلحة سابقا (المُثبتة بالأدلة)


| المشكلة المزعومة                          | الحكم       | الدليل                                                                                     |
| ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `isLoading` لا يُعاد عند الخروج المبكر    | وهمي        | `finally { setIsLoading(false); }` في سطر 161-163 يضمن الإعادة دائما                       |
| `login_failed` يسجل `error.message` الخام | مُصلح       | سطر 146: `error_message: 'login_error'` (ثابت)                                             |
| `login_success` يسجل رقم الهوية           | مُصلح       | سطر 153: `loginMethod === 'national_id' ? null : resolvedEmail`                            |
| `guard-signup` يُرجع user object كاملا    | مُصلح       | سطر 116-118: يُرجع `{ success: true, message: "..." }` فقط                                 |
| `set_role` غير atomic                     | مُصلح       | سطر 163-164: `upsert` مع `onConflict`                                                      |
| `bulk_create_users` نجاح كاذب             | مُصلح       | سطر 321-343: فحص أخطاء + rollback                                                          |
| `create_user` يُرجع user كاملا            | مُصلح       | سطر 278: `{ id, email }` فقط                                                               |
| `getSession` fallback race                | وهمي        | JavaScript single-threaded، `onAuthStateChange` callback متزامن يُنفذ قبل `.then()`        |
| `navigator` غير محمي من SSR               | غير مطبق    | المشروع Vite SPA، لا SSR                                                                   |
| `resetMode` لا يُلغى عند الخطأ            | تصميم مقصود | يسمح للمستخدم بتصحيح المدخل وإعادة المحاولة                                                |
| `list_users` بدون pagination              | نظري        | النظام ~17 مستخدم، الحد 500 كافي                                                           |
| `signIn` loading يبقى true                | وهمي        | `AuthContext.signIn` سطر 180: `setLoading(false)` عند الخطأ، وعند النجاح `fetchRole` يضبطه |


---

## ملخص الإصلاحات المطلوبة


| الملف                                         | التعديل                                                 |
| --------------------------------------------- | ------------------------------------------------------- |
| `admin-manage-users/index.ts` سطر 224-276     | إضافة فحص أخطاء + rollback لـ `create_user` الفردي      |
| `admin-manage-users/index.ts` سطر 270         | إضافة `.catch(() => {})` لـ `notify_admins`             |
| `admin-manage-users/index.ts` سطر 317,327,341 | تعقيم رسائل الأخطاء في `bulk_create_users` errors array |
| `auto-expire-contracts/index.ts` سطر 92-94    | استبدال ٨٨٨٨٧`error.message` برسالة آمنة                |
| `generate-invoice-pdf/index.ts` catch الخارجي | استبدال الخطأ الخام برسالة آمنة                         |
