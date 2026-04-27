import { json, ok, type HandlerContext, type HandlerResult } from "./types.ts";
import { validateRole, validateUuid } from "../validators.ts";

export async function setRole({ admin, body, callerId, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const { userId, role } = body;
  validateUuid(userId);
  validateRole(role);
  if (userId === callerId) {
    return json({ error: "لا يمكنك تغيير دورك بنفسك" }, 400, corsHeaders);
  }
  // حذف الدور القديم ثم إدراج الجديد (القيد الفريد على user_id+role وليس user_id وحده)
  const { error: delError } = await admin.from("user_roles").delete().eq("user_id", userId);
  if (delError) throw delError;
  const { error } = await admin.from("user_roles").insert({ user_id: userId, role });
  if (error) throw error;
  return ok({ success: true }, corsHeaders);
}
