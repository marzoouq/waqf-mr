import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@11";
import { isoUint8Array } from "npm:@simplewebauthn/server@11/helpers";
import { getCorsHeaders, ALLOWED_ORIGINS, ALLOWED_ORIGIN_PATTERNS } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * استخراج rpID و origin من الطلب مع التحقق من origin whitelist.
 * WebAuthn يتطلب أن يتطابق rpID مع نطاق الصفحة الحالية تماماً.
 */
function getRpInfo(req: Request) {
  const origin = req.headers.get("origin") || "https://waqf-mr.lovable.app";
  
  // التحقق من أن الـ origin مسموح به
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));

  if (!isAllowed) {
    throw new Error("Origin غير مسموح به");
  }

  const url = new URL(origin);
  const rpID = url.hostname;
  
  return {
    rpID,
    rpName: "نظام إدارة الوقف",
    origin,
  };
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const { action, ...body } = await req.json();
    const admin = getSupabaseAdmin();
    const rp = getRpInfo(req);

    // ─── تسجيل البصمة: توليد خيارات التسجيل ───
    if (action === "register-options") {
      const user = await getAuthUser(req);
      if (!user) return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401, headers: cors });

      // Rate limiting: 10 requests/minute per user
      const { data: isLimited, error: rlError } = await admin.rpc("check_rate_limit", {
        p_key: `webauthn:register:${user.id}`,
        p_limit: 10,
        p_window_seconds: 60,
      });
      if (rlError || isLimited) {
        return new Response(JSON.stringify({ error: "طلبات كثيرة، حاول لاحقاً" }), { status: 429, headers: cors });
      }

      // جلب بيانات الاعتماد الموجودة
      const { data: existing } = await admin
        .from("webauthn_credentials")
        .select("credential_id")
        .eq("user_id", user.id);

      const excludeCredentials = (existing || []).map((c: { credential_id: string }) => ({
        id: c.credential_id,
        type: "public-key" as const,
      }));

      const options = await generateRegistrationOptions({
        rpName: rp.rpName,
        rpID: rp.rpID,
        userID: isoUint8Array.fromUTF8String(user.id),
        userName: user.email || user.id,
        userDisplayName: user.email || "مستخدم",
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
          userVerification: "preferred",
          residentKey: "preferred",
          requireResidentKey: false,
        },
      });

      // تنظيف التحديات القديمة ثم حفظ التحدي الجديد
      await admin.rpc("cleanup_expired_challenges");
      const { data: insertedChallenge } = await admin.from("webauthn_challenges").insert({
        user_id: user.id,
        challenge: options.challenge,
        type: "registration",
      }).select("id").single();

      return new Response(JSON.stringify({
        ...options,
        challenge_id: insertedChallenge?.id || null,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ─── تسجيل البصمة: التحقق من الاستجابة ───
    if (action === "register-verify") {
      const user = await getAuthUser(req);
      if (!user) return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401, headers: cors });

      const { credential, deviceName, challenge_id } = body;

      // جلب التحدي بواسطة challenge_id المحدد (بدل ORDER BY الأحدث)
      let challengeRow: { challenge: string } | null = null;

      if (challenge_id) {
        const { data } = await admin
          .from("webauthn_challenges")
          .select("challenge")
          .eq("id", challenge_id)
          .eq("user_id", user.id)
          .eq("type", "registration")
          .single();
        challengeRow = data;
      } else {
        return new Response(JSON.stringify({ error: "challenge_id مطلوب" }), { status: 400, headers: cors });
      }

      if (!challengeRow) {
        return new Response(JSON.stringify({ error: "التحدي منتهي الصلاحية" }), { status: 400, headers: cors });
      }

      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return new Response(JSON.stringify({ error: "فشل التحقق من البصمة" }), { status: 400, headers: cors });
      }

      const { credential: regCred } = verification.registrationInfo;

      const toBase64 = (arr: Uint8Array) =>
        btoa(Array.from(arr, (b) => String.fromCharCode(b)).join(''));
      const credIdBase64 = toBase64(regCred.id);
      const pubKeyBase64 = toBase64(regCred.publicKey);

      await admin.from("webauthn_credentials").insert({
        user_id: user.id,
        credential_id: credIdBase64,
        public_key: pubKeyBase64,
        counter: regCred.counter,
        device_name: deviceName || "جهاز غير مسمى",
        transports: credential.response?.transports || [],
      });

      // حذف التحدي المُستخدم فقط (بدل حذف كل تحديات التسجيل)
      await admin.from("webauthn_challenges").delete()
        .eq("user_id", user.id)
        .eq("challenge", challengeRow.challenge);

      return new Response(JSON.stringify({ verified: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ─── تسجيل الدخول بالبصمة: توليد خيارات المصادقة ───
    if (action === "auth-options") {
      // Rate limiting: 10 طلبات/دقيقة لكل IP
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown";
      const { data: allowed, error: rlError } = await admin.rpc("check_rate_limit", {
        p_key: `webauthn:auth:${clientIp}`,
        p_limit: 10,
        p_window_seconds: 60,
      });
      // Fail-closed: إذا فشل الفحص أو تجاوز الحد → رفض
      if (rlError || allowed === false) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول بعد دقيقة" }), {
          status: 429,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // تنظيف التحديات القديمة
      await admin.rpc("cleanup_expired_challenges");

      const options = await generateAuthenticationOptions({
        rpID: rp.rpID,
        userVerification: "preferred",
      });

      // حفظ التحدي وإرجاع challenge_id لربطه بالتحقق لاحقاً
      const { data: insertedChallenge } = await admin.from("webauthn_challenges").insert({
        challenge: options.challenge,
        type: "authentication",
      }).select("id").single();

      return new Response(JSON.stringify({
        ...options,
        challenge_id: insertedChallenge?.id || null,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ─── تسجيل الدخول بالبصمة: التحقق من الاستجابة ───
    if (action === "auth-verify") {
      const { credential, challenge_id } = body;

      // البحث عن بيانات الاعتماد بواسطة credential_id أولاً
      const credIdBase64 = credential.id;
      const { data: storedCred } = await admin
        .from("webauthn_credentials")
        .select("*")
        .eq("credential_id", credIdBase64)
        .single();

      if (!storedCred) {
        return new Response(JSON.stringify({ error: "بيانات الاعتماد غير موجودة" }), { status: 400, headers: cors });
      }

      // جلب التحدي بواسطة challenge_id وربطه بصاحب بيانات الاعتماد
      let challengeRow: { id: string; challenge: string; user_id: string | null } | null = null;

      if (challenge_id) {
        const { data } = await admin
          .from("webauthn_challenges")
          .select("id, challenge, user_id")
          .eq("id", challenge_id)
          .eq("type", "authentication")
          .or(`user_id.is.null,user_id.eq.${storedCred.user_id}`)
          .single();
        challengeRow = data;

        // ربط التحدي بالمستخدم عند أول تحقق لمنع إعادة استخدامه عبر مستخدم آخر
        if (challengeRow?.user_id === null) {
          await admin
            .from("webauthn_challenges")
            .update({ user_id: storedCred.user_id })
            .eq("id", challenge_id)
            .eq("type", "authentication")
            .is("user_id", null);
        }
      } else {
        // Fallback removed: challenge_id is always provided by the client.
        // Rejecting requests without it prevents cross-user challenge retrieval.
        return new Response(JSON.stringify({ error: "challenge_id مطلوب" }), { status: 400, headers: cors });
      }

      if (!challengeRow) {
        return new Response(JSON.stringify({ error: "التحدي منتهي الصلاحية" }), { status: 400, headers: cors });
      }

      // تحويل المفتاح العام من base64 إلى Uint8Array
      const pubKeyBytes = Uint8Array.from(atob(storedCred.public_key), c => c.charCodeAt(0));
      const credIdBytes = Uint8Array.from(atob(storedCred.credential_id), c => c.charCodeAt(0));

      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        credential: {
          id: credIdBytes,
          publicKey: pubKeyBytes,
          counter: Number(storedCred.counter),
          transports: storedCred.transports || [],
        },
      });

      if (!verification.verified) {
        return new Response(JSON.stringify({ error: "فشل التحقق من البصمة" }), { status: 400, headers: cors });
      }

      // تحديث العداد
      await admin
        .from("webauthn_credentials")
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq("id", storedCred.id);

      // حذف التحدي
      await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

      // إنشاء رابط تسجيل دخول سحري للمستخدم
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(storedCred.user_id);
      if (userError || !userData?.user?.email) {
        console.error("getUserById failed");
        return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), { status: 400, headers: cors });
      }

      // إنشاء الجلسة server-side مباشرة بدلاً من إرسال hashed_token للعميل
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

      if (linkError || !linkData?.properties?.hashed_token) {
        return new Response(JSON.stringify({ error: "فشل إنشاء جلسة" }), { status: 500, headers: cors });
      }

      // التحقق من الـ OTP server-side وإنشاء الجلسة
      const { data: sessionData, error: sessionError } = await admin.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

      if (sessionError || !sessionData?.session) {
        console.error("Server-side OTP verification failed");
        return new Response(JSON.stringify({ error: "فشل إنشاء جلسة" }), { status: 500, headers: cors });
      }

      // إرسال الجلسة مباشرة — لا يتم كشف hashed_token للعميل أبداً
      return new Response(JSON.stringify({
        verified: true,
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "إجراء غير معروف" }), { status: 400, headers: cors });
  } catch (err) {
    console.error("WebAuthn error:", err instanceof Error ? err.message : "Unknown error");
    return new Response(JSON.stringify({ error: "حدث خطأ داخلي" }), { status: 500, headers: getCorsHeaders(req) });
  }
});
