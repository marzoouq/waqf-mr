import { verifyRegistrationResponse } from "npm:@simplewebauthn/server@11";
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getAuthUser, RpInfo, toBase64 } from "../helpers.ts";

// credential يأتي من client كـ JSON خام؛ نمرره مباشرةً للمكتبة كما في النسخة الأصلية.
// deno-lint-ignore no-explicit-any
type WebAuthnCredential = any;

interface RegisterVerifyBody {
  credential: WebAuthnCredential;
  deviceName?: string;
  challenge_id?: string;
}

export async function handleRegisterVerify(
  req: Request,
  admin: SupabaseClient,
  rp: RpInfo,
  body: RegisterVerifyBody,
  cors: Record<string, string>,
): Promise<Response> {
  const user = await getAuthUser(req);
  if (!user) return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401, headers: cors });

  const { credential, deviceName, challenge_id } = body;

  if (!challenge_id) {
    return new Response(JSON.stringify({ error: "challenge_id مطلوب" }), { status: 400, headers: cors });
  }

  const { data: challengeRow } = await admin
    .from("webauthn_challenges")
    .select("challenge")
    .eq("id", challenge_id)
    .eq("user_id", user.id)
    .eq("type", "registration")
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

  // In @simplewebauthn/types@11, regCred.id is already a Base64URLString.
  const credIdBase64 = regCred.id;
  const pubKeyBase64 = toBase64(regCred.publicKey);

  await admin.from("webauthn_credentials").insert({
    user_id: user.id,
    credential_id: credIdBase64,
    public_key: pubKeyBase64,
    counter: regCred.counter,
    device_name: deviceName || "جهاز غير مسمى",
    transports: credential.response?.transports || [],
  });

  await admin.from("webauthn_challenges").delete()
    .eq("user_id", user.id)
    .eq("challenge", challengeRow.challenge);

  return new Response(JSON.stringify({ verified: true }), { headers: { ...cors, "Content-Type": "application/json" } });
}
