import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 120;

/** Mask email: "user@example.com" → "u***@example.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";
  const visible = local.slice(0, Math.max(1, Math.ceil(local.length * 0.3)));
  return `${visible}***@${domain}`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "خطأ في إعدادات الخادم" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Rate limiting عبر قاعدة البيانات (يعمل بشكل موثوق عبر كل instances)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `lookup_nid:${clientIp}`;

    // Query current count before checking
    const { data: currentCount } = await supabase
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', rateLimitKey)
      .maybeSingle();

    const { data: isLimited, error: rlError } = await supabase.rpc('check_rate_limit', {
      p_key: rateLimitKey,
      p_limit: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
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
      // Calculate seconds until window resets
      let retryAfter = RATE_WINDOW_SECONDS;
      if (currentCount?.window_start) {
        const windowStart = new Date(currentCount.window_start).getTime();
        const windowEnd = windowStart + RATE_WINDOW_SECONDS * 1000;
        retryAfter = Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000));
      }
      return new Response(
        JSON.stringify({
          error: "تم تجاوز حد المحاولات، يرجى الانتظار",
          remaining: 0,
          retry_after: retryAfter,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate remaining attempts after this request
    const usedCount = (currentCount?.count ?? 0) + 1;
    const remaining = Math.max(0, RATE_LIMIT - usedCount);

    const body = await req.json();
    const rawId = body.national_id;
    const password = body.password; // Optional: if provided, perform server-side auth

    // تحويل الأرقام العربية-الهندية والفارسية إلى لاتينية (Defense in Depth)
    const national_id = typeof rawId === "string"
      ? rawId
          .replace(/[٠-٩]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
          .replace(/[۰-۹]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
          .trim()
      : rawId;

    // Input validation: must be exactly 10 digits
    if (!national_id || typeof national_id !== "string" || !/^\d{10}$/.test(national_id)) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية يجب أن يكون 10 أرقام", remaining }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fixed delay to prevent timing-based enumeration
    const fixedDelay = 300;
    const startTime = Date.now();

    let email: string | null = null;

    try {
      // البحث بالهوية مع فك التشفير عبر دالة مخصصة
      const { data, error } = await supabase.rpc('lookup_by_national_id', {
        p_national_id: national_id,
      });

      if (!error && data && data.length > 0 && data[0]?.email) {
        email = data[0].email;
      }
    } catch (dbErr) {
      console.error("lookup_by_national_id failed:", (dbErr as Error).message);
      return new Response(
        JSON.stringify({ error: "خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure consistent response time regardless of result
    const elapsed = Date.now() - startTime;
    if (elapsed < fixedDelay) {
      await new Promise(r => setTimeout(r, fixedDelay - elapsed));
    }

    // Not found — identical response structure
    if (!email) {
      return new Response(
        JSON.stringify({ found: false, masked_email: null, remaining }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If password provided, perform server-side authentication
    if (password && typeof password === "string" && password.length >= 8) {
      try {
        // Use Supabase Auth REST API directly for password auth
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey || serviceRoleKey,
          },
          body: JSON.stringify({ email, password }),
        });

        const authData = await authResponse.json();

        if (!authResponse.ok) {
          // Return generic error — don't reveal if email exists
          const errMsg = authData?.error_description || authData?.msg || "";
          const isInvalidCreds = errMsg.toLowerCase().includes("invalid login credentials");
          return new Response(
            JSON.stringify({
              found: true,
              masked_email: maskEmail(email),
              remaining,
              auth_error: isInvalidCreds
                ? "كلمة المرور غير صحيحة"
                : "فشل تسجيل الدخول",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Auth success — return session tokens (NOT email)
        return new Response(
          JSON.stringify({
            found: true,
            masked_email: maskEmail(email),
            remaining,
            session: {
              access_token: authData.access_token,
              refresh_token: authData.refresh_token,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (authErr) {
        console.error("Auth error:", (authErr as Error).message);
        return new Response(
          JSON.stringify({
            found: true,
            masked_email: maskEmail(email),
            remaining,
            auth_error: "خطأ مؤقت في المصادقة",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // No password provided — return masked email only (never full email)
    return new Response(
      JSON.stringify({ found: true, masked_email: maskEmail(email), remaining }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "خطأ في معالجة الطلب" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
