import { ok, type HandlerContext, type HandlerResult } from "./types.ts";
import { validateEmail, validateUuid } from "../validators.ts";

export async function updateEmail({ admin, body, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const { userId, email } = body;
  validateUuid(userId);
  validateEmail(email);
  const { error } = await admin.auth.admin.updateUserById(userId, { email });
  if (error) throw error;
  return ok({ success: true }, corsHeaders);
}
