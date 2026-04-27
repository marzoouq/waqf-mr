import { verifyAuthenticationResponse } from "npm:@simplewebauthn/server@11";
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { RpInfo, fromBase64 } from "../helpers.ts";

// credential يأتي من client كـ JSON خام؛ نمرره مباشرةً للمكتبة كما في النسخة الأصلية.
// deno-lint-ignore no-explicit-any
type WebAuthnCredential = any;

interface AuthVerifyBody {
  credential: WebAuthnCredential;
  challenge_id?: string;
}

export async function handleAuthVerify(
  admin: SupabaseClient,
  rp: RpInfo,
  body: AuthVerifyBody,
  cors: Record<string, string>,
): Promise<Response> {
  const { credential, challenge_id } = body;
  const credIdBase64 = credential.id;

  const { data: storedCred } = await admin
    .from("webauthn_credentials")
    .select("*")
    .eq("credential_id", credIdBase64)
    .single();

  if (!storedCred) {
    return new Response(JSON.stringify({ error: "بيانات الاعتماد غير موجودة" }), { status: 400, headers: cors });
  }

  if (!challenge_id) {
    return new Response(JSON.stringify({ error: "challenge_id مطلوب" }), { status: 400, headers: cors });
  }

  const { data: challengeRow } = await admin
    .from("webauthn_challenges")
    .select("id, challenge, user_id")
    .eq("id", challenge_id)
    .eq("type", "authentication")
    .or(`user_id.is.null,user_id.eq.${storedCred.user_id}`)
    .single();

  if (!challengeRow) {
    return new Response(JSON.stringify({ error: "التحدي منتهي الصلاحية" }), { status: 400, headers: cors });
  }

  // ربط التحدي بالمستخدم عند أول تحقق لمنع إعادة استخدامه عبر مستخدم آخر
  if (challengeRow.user_id === null) {
    await admin
      .from("webauthn_challenges")
      .update({ user_id: storedCred.user_id })
      .eq("id", challenge_id)
      .eq("type", "authentication")
      .is("user_id", null);
  }

  const pubKeyBytes = fromBase64(storedCred.public_key);

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: challengeRow.challenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    credential: {
      id: storedCred.credential_id,
      publicKey: pubKeyBytes,
      counter: Number(storedCred.counter),
      transports: storedCred.transports || [],
    },
  });

  if (!verification.verified) {
    return new Response(JSON.stringify({ error: "فشل التحقق من البصمة" }), { status: 400, headers: cors });
  }

  await admin
    .from("webauthn_credentials")
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq("id", storedCred.id);

  await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

  // إنشاء جلسة server-side
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(storedCred.user_id);
  if (userError || !userData?.user?.email) {
    console.error("getUserById failed");
    return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), { status: 400, headers: cors });
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    return new Response(JSON.stringify({ error: "فشل إنشاء جلسة" }), { status: 500, headers: cors });
  }

  const { data: sessionData, error: sessionError } = await admin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionError || !sessionData?.session) {
    console.error("Server-side OTP verification failed");
    return new Response(JSON.stringify({ error: "فشل إنشاء جلسة" }), { status: 500, headers: cors });
  }

  return new Response(JSON.stringify({
    verified: true,
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_in: sessionData.session.expires_in,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
}
