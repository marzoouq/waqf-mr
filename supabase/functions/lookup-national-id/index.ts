import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 120;

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

    // Identical response structure for both found and not-found
    if (!email) {
      return new Response(
        JSON.stringify({ email: null, found: false, remaining }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ email, found: true, remaining }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "خطأ في معالجة الطلب" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
