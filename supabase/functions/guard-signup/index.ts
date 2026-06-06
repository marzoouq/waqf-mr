import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { getCorsHeaders } from "../_shared/cors.ts";

const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_RATE_WINDOW_SECONDS = 60;

// Batch 4: Zod schemas — رسائل خطأ موحّدة تطابق contract الاختبارات.
const EmailSchema = z
  .string({ invalid_type_error: "بريد إلكتروني غير صالح" })
  .trim()
  .min(1, "بريد إلكتروني غير صالح")
  .max(255, "بريد إلكتروني غير صالح")
  .email("بريد إلكتروني غير صالح");

const PasswordSchema = z
  .string({ invalid_type_error: "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً" })
  .min(8, "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً")
  .max(128, "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");

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

    const rawBody = await req.json().catch(() => ({}));

    // Batch 4: تحقق Zod متسلسل لإبقاء رسائل الخطأ موحّدة مع contract الاختبارات.
    const emailParsed = EmailSchema.safeParse((rawBody as { email?: unknown }).email);
    if (!emailParsed.success) {
      return new Response(JSON.stringify({ error: "بريد إلكتروني غير صالح" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = emailParsed.data;

    const passwordParsed = PasswordSchema.safeParse((rawBody as { password?: unknown }).password);
    if (!passwordParsed.success) {
      return new Response(JSON.stringify({ error: "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const password = passwordParsed.data;

    // فحص تعقيد كلمة المرور: حرف كبير + حرف صغير + رقم كحد أدنى
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasUpper || !hasLower || !hasDigit) {
      return new Response(JSON.stringify({ error: "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم على الأقل" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // فحص HIBP (Have I Been Pwned) عبر k-Anonymity:
    // Admin API لا يطبّق password_hibp_enabled لذا نُجريه يدوياً هنا.
    // Fail-open عند انقطاع الخدمة الخارجية حتى لا نوقف التسجيل.
    const HIBP_PWNED_MESSAGE = "كلمة المرور هذه ظهرت في تسريبات بيانات معروفة. يرجى اختيار كلمة مرور مختلفة.";
    try {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(password));
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      const prefix = hashHex.slice(0, 5);
      const suffix = hashHex.slice(5);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const hibpRes = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { "Add-Padding": "true", "User-Agent": "waqf-mr-guard-signup" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (hibpRes.ok) {
        const text = await hibpRes.text();
        const lines = text.split("\n");
        for (const line of lines) {
          const [lineSuffix, countStr] = line.trim().split(":");
          if (lineSuffix === suffix && Number(countStr) > 0) {
            return new Response(JSON.stringify({ error: HIBP_PWNED_MESSAGE }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else {
        console.warn(`HIBP check non-OK status: ${hibpRes.status}`);
      }
    } catch (hibpErr) {
      // Fail-open: نسجّل ونتابع
      console.warn("HIBP check failed (fail-open):", hibpErr instanceof Error ? hibpErr.message : String(hibpErr));
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
      const rawMsg = (createError.message || "").toLowerCase();
      let userMsg = "تعذر إتمام التسجيل";
      if (rawMsg.includes("already") || rawMsg.includes("registered") || rawMsg.includes("duplicate")) {
        userMsg = "هذا البريد الإلكتروني مسجل بالفعل";
      } else if (
        rawMsg.includes("pwned") ||
        rawMsg.includes("breach") ||
        rawMsg.includes("compromised") ||
        rawMsg.includes("leaked") ||
        (rawMsg.includes("password") && rawMsg.includes("weak"))
      ) {
        userMsg = HIBP_PWNED_MESSAGE;
      }
      return new Response(JSON.stringify({ error: userMsg }), {
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
        // Rollback: حذف المستخدم لمنع وجود حساب يتيم بدون دور
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        return new Response(JSON.stringify({ error: "تعذر إتمام التسجيل" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "تم إنشاء حسابك بنجاح. يرجى تأكيد بريدك الإلكتروني ثم انتظار موافقة الناظر لتفعيل صلاحياتك."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "خطأ في معالجة الطلب" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
