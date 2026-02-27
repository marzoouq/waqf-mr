

# إصلاح 3 مشاكل متبقية من الفحص الجنائي

## 1. `guard-signup` -- فشل الدور يترك مستخدم بدون role

**الملف:** `supabase/functions/guard-signup/index.ts` سطور 102-110

**المشكلة الحالية:** إذا فشل `insert` الدور في سطر 103-105، المستخدم يبقى موجوداً في auth بدون دور. التعليق يقول "لا نفشل العملية" لكن هذا يترك مستخدم يتيم.

**الإصلاح:** إذا فشل insert الدور، نحذف المستخدم ونعيد خطأ:
```text
if (roleError) {
  console.error("guard-signup role assignment error");
  await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
  return new Response(JSON.stringify({ error: "تعذر إتمام التسجيل" }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
```

ملاحظة: هذا يتوافق مع نمط rollback المستخدم في `admin-manage-users` (سطر 244).

---

## 2. `auth-email-hook` -- توحيد CORS مع بقية الدوال

**الملف:** `supabase/functions/auth-email-hook/index.ts` سطر 12-16

**المشكلة:** يستخدم `Access-Control-Allow-Origin: *` بينما بقية الدوال تستخدم `getCorsHeaders(req)`.

**الإصلاح:** استبدال `corsHeaders` الثابت بـ `getCorsHeaders(req)` من `_shared/cors.ts`. الدالة مستوردة أصلاً (`import { getCorsHeaders } from ...` غير موجود حالياً). سنضيف الاستيراد ونستبدل الاستخدامات.

ملاحظة: هذه الدالة هي webhook داخلي يتم التحقق منه عبر توقيع (`verifyWebhookRequest`) لذا المخاطر العملية منخفضة، لكن التوحيد مطلوب للنظافة المعمارية.

---

## 3. CSP `unsafe-inline` -- لا يمكن إزالته حالياً

**الملف:** `index.html` سطر 6

**التوضيح:** `'unsafe-inline'` مطلوب لأن:
- Vite يحقن inline scripts أثناء التطوير
- الـ splash screen في body يستخدم inline `<style>` tags
- إزالته ستكسر التطبيق تماماً

**الإجراء:** لن نغيّر هذا. هذا قيد معماري من Vite. الحماية الفعلية ضد XSS تأتي من React's DOM escaping + CSP restrictions الأخرى (no eval, object-src none).

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `supabase/functions/guard-signup/index.ts` | Rollback المستخدم عند فشل الدور |
| `supabase/functions/auth-email-hook/index.ts` | استبدال CORS wildcard بـ getCorsHeaders |

ملاحظة: نشر الدوال سيتم تلقائياً بعد التعديل.

