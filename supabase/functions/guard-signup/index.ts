import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_RATE_WINDOW_SECONDS = 60;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limiting عبر قاعدة البيانات (يعمل بشكل موثوق عبر كل instances)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: isLimited, error: rlError } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: `signup:${clientIp}`,
      p_limit: SIGNUP_RATE_LIMIT,
      p_window_seconds: SIGNUP_RATE_WINDOW_SECONDS,
    });

    // Fail-closed: إذا فشل التحقق من rate limit نرفض الطلب احترازياً
    if (rlError) {
      console.error("rate_limit check failed");
      return new Response(
        JSON.stringify({ error: "خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isLimited) {
      return new Response(JSON.stringify({ error: "تم تجاوز حد المحاولات، يرجى المحاولة لاحقاً" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password } = await req.json();

    // Input validation
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return new Response(JSON.stringify({ error: "بريد إلكتروني غير صالح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!password || typeof password !== "string" || password.length < 8 || password.length > 128) {
      return new Response(JSON.stringify({ error: "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check registration_enabled setting
    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "registration_enabled")
      .maybeSingle();

    if (!setting || setting.value !== "true") {
      return new Response(JSON.stringify({ error: "التسجيل معطل حالياً" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user via Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: false,
    });

    if (createError) {
      console.error("guard-signup createUser error");
      return new Response(JSON.stringify({ error: "تعذر إتمام التسجيل" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // تعيين دور افتراضي (مستفيد) — تصميم مقصود:
    // الدور يُمنح فوراً لكن المستخدم لا يستطيع الوصول الفعلي لأن:
    // 1. البريد غير مؤكد (email_confirm: false) → لا يمكنه تسجيل الدخول
    // 2. تأكيد البريد يتم يدوياً من الناظر فقط عبر لوحة إدارة المستخدمين
    // 3. بدون تأكيد البريد + تسجيل الدخول، سياسات RLS تمنع أي وصول للبيانات
    if (userData.user) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userData.user.id, role: "beneficiary" });
      if (roleError) {
        console.error("guard-signup role assignment error");
        // لا نفشل العملية — المستخدم أُنشئ بنجاح ويمكن للناظر تعيين الدور لاحقاً
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "تم إنشاء حسابك بنجاح. يرجى تأكيد بريدك الإلكتروني ثم انتظار موافقة الناظر لتفعيل صلاحياتك."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "خطأ في معالجة الطلب" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
