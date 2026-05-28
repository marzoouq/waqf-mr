// ═══════════════════════════════════════════════════════════════════════════════
// link-beneficiary — ربط مستفيد بمستخدم (admin فقط)
// ═══════════════════════════════════════════════════════════════════════════════
import { ok, json, type HandlerContext, type HandlerResult } from "./types.ts";
import { validateUuid } from "../validators.ts";

export async function linkBeneficiary(
  { admin, callerId, body, corsHeaders }: HandlerContext,
): Promise<HandlerResult> {
  const { beneficiaryId, userId } = body;
  validateUuid(beneficiaryId);
  validateUuid(userId);

  // التأكد أن المستخدم موجود فعلاً
  const { data: userExists, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userExists?.user) {
    return json({ error: "المستخدم غير موجود" }, 404, corsHeaders);
  }

  // التأكد أن المستفيد موجود
  const { data: ben, error: benErr } = await admin
    .from("beneficiaries")
    .select("id, name, user_id")
    .eq("id", beneficiaryId)
    .maybeSingle();
  if (benErr) throw benErr;
  if (!ben) return json({ error: "المستفيد غير موجود" }, 404, corsHeaders);

  const previousUserId = ben.user_id;

  const { error: updErr } = await admin
    .from("beneficiaries")
    .update({ user_id: userId })
    .eq("id", beneficiaryId);
  if (updErr) throw updErr;

  // سجل تدقيق صريح (بما أن العملية حساسة)
  await admin.from("audit_log").insert({
    user_id: callerId,
    table_name: "beneficiaries",
    operation: "LINK_USER",
    record_id: beneficiaryId,
    old_data: { user_id: previousUserId },
    new_data: { user_id: userId },
  }).then(() => {}, () => {/* لا نوقف العملية عند فشل التدقيق */});

  return ok({ success: true, beneficiary_id: beneficiaryId, user_id: userId }, corsHeaders);
}
