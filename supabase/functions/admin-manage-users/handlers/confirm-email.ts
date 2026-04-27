import { ok, type HandlerContext, type HandlerResult } from "./types.ts";
import { validateUuid } from "../validators.ts";

export async function confirmEmail({ admin, body, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const { userId } = body;
  validateUuid(userId);
  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) throw error;
  return ok({ success: true }, corsHeaders);
}
