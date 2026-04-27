import { generateAuthenticationOptions } from "npm:@simplewebauthn/server@11";
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { RpInfo } from "../helpers.ts";

export async function handleAuthOptions(
  req: Request,
  admin: SupabaseClient,
  rp: RpInfo,
  cors: Record<string, string>,
): Promise<Response> {
  // Rate limiting: 10 طلبات/دقيقة لكل IP
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  const { data: isLimited, error: rlError } = await admin.rpc("check_rate_limit", {
    p_key: `webauthn:auth:${clientIp}`,
    p_limit: 10,
    p_window_seconds: 60,
  });
  if (rlError || isLimited) {
    return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول بعد دقيقة" }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  await admin.rpc("cleanup_expired_challenges");

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: "preferred",
  });

  const { data: insertedChallenge } = await admin.from("webauthn_challenges").insert({
    challenge: options.challenge,
    type: "authentication",
  }).select("id").single();

  return new Response(JSON.stringify({
    ...options,
    challenge_id: insertedChallenge?.id || null,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
}
