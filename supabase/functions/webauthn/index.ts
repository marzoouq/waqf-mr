import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@11";
import { isoUint8Array } from "npm:@simplewebauthn/server@11/helpers";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * استخراج rpID و origin من الطلب.
 * WebAuthn يتطلب أن يتطابق rpID مع نطاق الصفحة الحالية تماماً.
 * نستخدم نطاقاً عاماً (eTLD+1) بحيث يعمل مع أي نطاق فرعي.
 */
function getRpInfo(req: Request) {
  const origin = req.headers.get("origin") || "https://waqf-mr.lovable.app";
  const url = new URL(origin);
  
  // استخدام الـ hostname الكامل كـ rpID لضمان التطابق
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

      // جلب بيانات الاعتماد الموجودة
      const { data: existing } = await admin
        .from("webauthn_credentials")
        .select("credential_id")
        .eq("user_id", user.id);

      const excludeCredentials = (existing || []).map((c: any) => ({
        id: c.credential_id,
        type: "public-key" as const,
      }));

      const options = await generateRegistrationOptions({
        rpName: rp.rpName,
        rpID: rp.rpID,
        // v10+ يتطلب userID كـ Uint8Array
        userID: isoUint8Array.fromUTF8String(user.id),
        userName: user.email || user.id,
        userDisplayName: user.email || "مستخدم",
        attestationType: "none",
        excludeCredentials,
        authenticatorSelection: {
          // لا نحدد authenticatorAttachment لدعم كل أنواع المصادقة
          userVerification: "preferred",
          residentKey: "preferred",
          requireResidentKey: false,
        },
      });

      // تنظيف التحديات القديمة ثم حفظ التحدي الجديد
      await admin.rpc("cleanup_expired_challenges");
      await admin.from("webauthn_challenges").insert({
        user_id: user.id,
        challenge: options.challenge,
        type: "registration",
      });

      return new Response(JSON.stringify(options), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ─── تسجيل البصمة: التحقق من الاستجابة ───
    if (action === "register-verify") {
      const user = await getAuthUser(req);
      if (!user) return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401, headers: cors });

      const { credential, deviceName } = body;

      // جلب التحدي المحفوظ
      const { data: challengeRow } = await admin
        .from("webauthn_challenges")
        .select("challenge")
        .eq("user_id", user.id)
        .eq("type", "registration")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

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

      // Convert Uint8Array to base64url string for storage
      const credIdBase64 = btoa(String.fromCharCode(...regCred.id));
      const pubKeyBase64 = btoa(String.fromCharCode(...regCred.publicKey));

      await admin.from("webauthn_credentials").insert({
        user_id: user.id,
        credential_id: credIdBase64,
        public_key: pubKeyBase64,
        counter: regCred.counter,
        device_name: deviceName || "جهاز غير مسمى",
        transports: credential.response?.transports || [],
      });

      // حذف التحدي المستخدم
      await admin.from("webauthn_challenges").delete().eq("user_id", user.id).eq("type", "registration");

      return new Response(JSON.stringify({ verified: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ─── تسجيل الدخول بالبصمة: توليد خيارات المصادقة ───
    if (action === "auth-options") {
      // تنظيف التحديات القديمة
      await admin.rpc("cleanup_expired_challenges");

      const options = await generateAuthenticationOptions({
        rpID: rp.rpID,
        userVerification: "preferred",
      });

      // حفظ التحدي (بدون user_id لأن المستخدم لم يسجل دخوله بعد)
      await admin.from("webauthn_challenges").insert({
        challenge: options.challenge,
        type: "authentication",
      });

      return new Response(JSON.stringify(options), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ─── تسجيل الدخول بالبصمة: التحقق من الاستجابة ───
    if (action === "auth-verify") {
      const { credential } = body;

      // جلب التحدي
      const { data: challengeRow } = await admin
        .from("webauthn_challenges")
        .select("id, challenge")
        .eq("type", "authentication")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!challengeRow) {
        return new Response(JSON.stringify({ error: "التحدي منتهي الصلاحية" }), { status: 400, headers: cors });
      }

      // البحث عن بيانات الاعتماد بواسطة credential_id
      const credIdBase64 = credential.id;
      const { data: storedCred } = await admin
        .from("webauthn_credentials")
        .select("*")
        .eq("credential_id", credIdBase64)
        .single();

      if (!storedCred) {
        return new Response(JSON.stringify({ error: "بيانات الاعتماد غير موجودة" }), { status: 400, headers: cors });
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
      const { data: userData } = await admin.auth.admin.getUserById(storedCred.user_id);
      if (!userData?.user?.email) {
        return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), { status: 400, headers: cors });
      }

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

      if (linkError || !linkData) {
        return new Response(JSON.stringify({ error: "فشل إنشاء جلسة" }), { status: 500, headers: cors });
      }

      return new Response(JSON.stringify({
        verified: true,
        email: userData.user.email,
        token_hash: linkData.properties.hashed_token,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "إجراء غير معروف" }), { status: 400, headers: cors });
  } catch (err) {
    console.error("WebAuthn error:", err);
    return new Response(JSON.stringify({ error: "حدث خطأ داخلي", details: String(err) }), { status: 500, headers: getCorsHeaders(req) });
  }
});
