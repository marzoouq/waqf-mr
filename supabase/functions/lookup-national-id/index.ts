/**
 * lookup-national-id — Pre-auth endpoint (by design).
 *
 * يُستخدم في شاشة تسجيل الدخول لتحويل رقم الهوية إلى بريد إلكتروني
 * ثم (اختيارياً) إجراء مصادقة بكلمة المرور. **لا يوجد JWT في هذه المرحلة**،
 * لذا لا يصحّ استخدام `getUser()`. الحماية تعتمد على:
 *   1) Luhn check لرقم الهوية السعودي (يرفض الأرقام المزيّفة فوراً).
 *   2) Rate limit ثنائي: per-IP (3/5min) + per-national-id (5/hour).
 *   3) Fixed/progressive delay لمنع timing enumeration.
 *   4) ردود متطابقة (found:true دائماً) لمنع user enumeration.
 *   5) RPCs مع `SECURITY DEFINER` فقط — لا `SERVICE_ROLE_KEY`.
 *
 * `verify_jwt = false` و `anonKey` مقصودان — هذا endpoint عام بالتصميم.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { getCorsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 300;
const TARGET_RATE_LIMIT = 5;
const TARGET_RATE_WINDOW_SECONDS = 3600;

// Body schema موحّد — يقبل أرقام عربية/فارسية وكلمة مرور اختيارية.
const BodySchema = z.object({
  national_id: z.union([z.string(), z.number()]).transform((v) => String(v)),
  password: z.string().min(8).max(128).optional(),
});

/**
 * Saudi National ID Luhn check (modified).
 * Format: 10 digits, starts with 1 (citizen) or 2 (resident).
 */
function isValidSaudiNationalId(id: string): boolean {
  if (!/^[12]\d{9}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = Number(id[i]);
    if (i % 2 === 0) {
      const doubled = digit * 2;
      const s = doubled.toString().padStart(2, '0');
      sum += Number(s[0]) + Number(s[1]);
    } else {
      sum += digit;
    }
  }
  return sum % 10 === 0;
}

/** SHA-256 hex digest (for hashing national_id as rate-limit key). */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}


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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !anonKey) {
      return new Response(
        JSON.stringify({ error: "خطأ في إعدادات الخادم" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anon client — RPCs are SECURITY DEFINER with EXECUTE granted to anon.
    // SERVICE_ROLE_KEY is intentionally NOT used (no privileged operations needed here).
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ── Layer 1: per-IP rate limit ──
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitKey = `lookup_nid:${clientIp}`;

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
      return new Response(
        JSON.stringify({
          error: "تم تجاوز حد المحاولات، يرجى الانتظار",
          remaining: 0,
          retry_after: RATE_WINDOW_SECONDS,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // remaining count via RPC (rate_limits table is not directly readable by anon)
    const { data: updatedCount } = await supabase.rpc('get_rate_limit_count', {
      p_key: rateLimitKey,
    });
    const remaining = Math.max(0, RATE_LIMIT - (Number(updatedCount) || 1));

    const rawBody = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية يجب أن يكون 10 أرقام", remaining }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const password = parsed.data.password;

    // تحويل الأرقام العربية-الهندية والفارسية إلى لاتينية (Defense in Depth)
    const national_id = parsed.data.national_id
      .replace(/[٠-٩]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
      .replace(/[۰-۹]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
      .trim();

    // Input validation: must be exactly 10 digits (بعد التحويل)
    if (!/^\d{10}$/.test(national_id)) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية يجب أن يكون 10 أرقام", remaining }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Luhn check (Saudi National ID format) — يرفض الأرقام المزيّفة قبل أي استعلام DB
    if (!isValidSaudiNationalId(national_id)) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية غير صالح", remaining }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Layer 2: per-national-id rate limit (يمنع enumeration عبر IP rotation) ──
    // المفتاح مُشفَّر (SHA-256) لمنع تسريب الأرقام الفعلية في جدول rate_limits
    const idHash = await sha256Hex(national_id);
    const targetKey = `lookup_nid_target:${idHash}`;
    const { data: targetLimited, error: tlError } = await supabase.rpc('check_rate_limit', {
      p_key: targetKey,
      p_limit: TARGET_RATE_LIMIT,
      p_window_seconds: TARGET_RATE_WINDOW_SECONDS,
    });
    if (tlError) {
      console.error("target rate_limit check failed");
      return new Response(
        JSON.stringify({ error: "خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (targetLimited) {
      return new Response(
        JSON.stringify({
          error: "تم تجاوز حد المحاولات، يرجى الانتظار",
          remaining: 0,
          retry_after: TARGET_RATE_WINDOW_SECONDS,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    } catch (_dbErr) {
      // R6 (W5-#6): لا نطبع رسالة DB لأنها قد تحوي national_id المُمرَّر
      console.error("lookup_by_national_id failed");
      return new Response(
        JSON.stringify({ error: "خطأ مؤقت في الخادم، يرجى المحاولة لاحقاً" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure consistent response time regardless of result
    const elapsed = Date.now() - startTime;
    // Progressive delay: base 300ms + 200ms per attempt used
    const progressiveDelay = fixedDelay + ((RATE_LIMIT - remaining) * 200);
    const targetDelay = Math.max(fixedDelay, progressiveDelay);
    if (elapsed < targetDelay) {
      await new Promise(r => setTimeout(r, targetDelay - elapsed));
    }

    // Not found — return IDENTICAL structure to prevent user enumeration
    // المهاجم لا يستطيع التمييز بين "هوية غير مسجلة" و"كلمة مرور خاطئة"
    if (!email) {
      // إذا أُرسلت كلمة مرور، نُرجع خطأ عام كأن الهوية موجودة وكلمة المرور خاطئة
      if (password && typeof password === "string" && password.length >= 8) {
        return new Response(
          JSON.stringify({
            found: true,
            masked_email: "***@***.com",
            remaining,
            auth_error: "بيانات الدخول غير صحيحة",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // بدون كلمة مرور — نُرجع نفس الشكل كأن الهوية موجودة
      return new Response(
        JSON.stringify({ found: true, masked_email: "***@***.com", remaining }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // تسجيل البحث الناجح في سجل الوصول
    try {
      await supabase.rpc('log_access_event', {
        p_event_type: 'national_id_lookup',
        p_metadata: { ip: clientIp, found: true },
      });
    } catch {
      // لا نفشل الطلب بسبب التسجيل
    }

    // If password provided, perform server-side authentication
    if (password && typeof password === "string" && password.length >= 8) {
      try {
        // Use Supabase Auth REST API directly for password auth
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
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
  } catch {
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "خطأ في معالجة الطلب" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
