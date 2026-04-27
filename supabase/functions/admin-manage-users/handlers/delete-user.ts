import { json, ok, type HandlerContext, type HandlerResult } from "./types.ts";
import { validateUuid } from "../validators.ts";

export async function deleteUser({ admin, body, callerId, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const { userId } = body;
  validateUuid(userId);
  if (userId === callerId) {
    return json({ error: "لا يمكنك حذف حسابك الخاص" }, 400, corsHeaders);
  }

  // حماية البيانات المالية: فحص وجود توزيعات تاريخية مرتبطة بالمستفيد
  const { data: beneficiary } = await admin
    .from("beneficiaries")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (beneficiary) {
    const { count } = await admin
      .from("distributions")
      .select("id", { count: "exact", head: true })
      .eq("beneficiary_id", beneficiary.id);

    if (count && count > 0) {
      // فصل المستفيد عن حساب المستخدم بدلاً من حذفه (soft-delete)
      await admin.from("beneficiaries").update({ user_id: null }).eq("id", beneficiary.id);
    } else {
      await admin.from("beneficiaries").delete().eq("user_id", userId);
    }
  }

  await admin.from("user_roles").delete().eq("user_id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
  return ok({ success: true }, corsHeaders);
}
