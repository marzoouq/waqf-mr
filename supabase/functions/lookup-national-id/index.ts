import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Simple in-memory rate limiter (per IP, 3 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز حد المحاولات، يرجى الانتظار دقيقة" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { national_id } = await req.json();

    // Input validation: must be exactly 10 digits
    if (!national_id || typeof national_id !== "string" || !/^\d{10}$/.test(national_id)) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية يجب أن يكون 10 أرقام" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Fixed delay to prevent timing-based enumeration
    const fixedDelay = 300;
    const startTime = Date.now();

    let email: string | null = null;

    try {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("email")
        .eq("national_id", national_id)
        .limit(1);

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
    // Same status code (200) to prevent enumeration via status codes
    if (!email) {
      return new Response(
        JSON.stringify({ email: null, found: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // حجب البريد الإلكتروني لمنع تسريب PII — يُعرض للمستخدم فقط كتلميح
    const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3');

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
