import { ok, type HandlerContext, type HandlerResult } from "./types.ts";

export async function toggleRegistration({ admin, body, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const enabled = body.enabled ? "true" : "false";
  const { error } = await admin
    .from("app_settings")
    .update({ value: enabled, updated_at: new Date().toISOString() })
    .eq("key", "registration_enabled");
  if (error) throw error;
  return ok({ success: true }, corsHeaders);
}
