import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 60;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    const { data: isLimited, error: rlError } = await supabase.rpc('check_rate_limit', {
      p_key: rateLimitKey,
      p_limit: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });

    // Fail-closed: إذا فشل التحقق من rate limit نرفض الطلب احترازياً
    if (rlError) {
      console.error("rate_limit check failed:", rlError.message);
      return new Response(
        JSON.stringify({ error: "خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isLimited) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز حد المحاولات، يرجى الانتظار دقيقة" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { national_id: rawId } = await req.json();

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
        JSON.stringify({ error: "رقم الهوية يجب أن يكون 10 أرقام" }),
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
    } catch {
      // Swallow DB errors - will return generic "not found" response
    }

    // Ensure consistent response time regardless of result
    const elapsed = Date.now() - startTime;
    if (elapsed < fixedDelay) {
      await new Promise(r => setTimeout(r, fixedDelay - elapsed));
    }

    // Identical response structure for both found and not-found
    if (!email) {
      return new Response(
        JSON.stringify({ email: null, found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // حجب البريد الإلكتروني لمنع تسريب PII
    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.length <= 2 ? '*'.repeat(localPart.length) : localPart.slice(0, 2) + '***';
    const maskedEmail = `${maskedLocal}@${domain}`;

    return new Response(
      JSON.stringify({ email: maskedEmail, found: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "خطأ في معالجة الطلب" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
