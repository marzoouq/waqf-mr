

# تحويل generate-invoice-pdf لاستخدام getClaims()

## الهدف
استبدال `getUser()` بـ `getClaims()` في وظيفة توليد فواتير PDF لتوحيد نمط المصادقة مع باقي الوظائف الخلفية وتحسين الأداء (getClaims يتحقق محلياً من التوكن بدون طلب شبكي إضافي).

## التغيير

**الملف:** `supabase/functions/generate-invoice-pdf/index.ts`

**قبل (سطر 362-383):**
- يستخدم `supabaseAdmin.auth.getUser(token)` الذي يرسل طلب شبكي لخادم المصادقة
- ينشئ عميل Supabase بـ `SERVICE_ROLE_KEY` فقط

**بعد:**
- إنشاء عميل Supabase إضافي بتوكن المستخدم لاستخدام `getClaims()`
- استخدام `getClaims(token)` للتحقق المحلي من JWT واستخراج `sub` (معرّف المستخدم)
- الاحتفاظ بعميل `supabaseAdmin` للعمليات الإدارية (رفع الملفات وتحديث السجلات)

### الكود الجديد (الجزء المتغير فقط):

```typescript
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
if (!isServiceRole) {
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = data.claims.sub;
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (!roles || roles.length === 0) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
```

## الفوائد
- **أداء أفضل:** getClaims() يتحقق من التوكن محلياً بدون طلب HTTP إضافي
- **توحيد النمط:** نفس أسلوب المصادقة المستخدم في admin-manage-users و auto-expire-contracts
- **لا تغييرات على المنطق التجاري:** باقي الوظيفة (توليد PDF، رفع الملفات) تبقى كما هي

