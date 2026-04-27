import { generateRegistrationOptions } from "npm:@simplewebauthn/server@11";
import { isoUint8Array } from "npm:@simplewebauthn/server@11/helpers";
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getAuthUser, RpInfo } from "../helpers.ts";

export async function handleRegisterOptions(
  req: Request,
  admin: SupabaseClient,
  rp: RpInfo,
  cors: Record<string, string>,
): Promise<Response> {
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
