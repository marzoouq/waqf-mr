import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signupRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_RATE_WINDOW_MS = 60_000;

function isSignupRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = signupRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    signupRateLimitMap.set(ip, { count: 1, resetAt: now + SIGNUP_RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > SIGNUP_RATE_LIMIT;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of signupRateLimitMap) {
    if (now > val.resetAt) signupRateLimitMap.delete(key);
  }
}, 5 * 60_000);

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
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isSignupRateLimited(clientIp)) {
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

    if (!password || typeof password !== "string" || password.length < 6 || password.length > 128) {
      return new Response(JSON.stringify({ error: "كلمة المرور يجب أن تكون بين 6 و 128 حرفاً" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
      console.error("guard-signup createUser error:", createError?.message);
      return new Response(JSON.stringify({ error: "تعذر إتمام التسجيل" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // تعيين دور افتراضي (مستفيد) لمنع بقاء المستخدم بدون صلاحيات
    if (userData.user) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userData.user.id, role: "beneficiary" });
      if (roleError) {
        console.error("guard-signup role assignment error:", roleError?.message);
        // لا نفشل العملية — المستخدم أُنشئ بنجاح ويمكن للناظر تعيين الدور لاحقاً
      }
    }

    return new Response(JSON.stringify({ 
      user: userData.user,
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
