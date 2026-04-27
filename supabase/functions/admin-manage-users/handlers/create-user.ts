import { ok, type HandlerContext, type HandlerResult } from "./types.ts";
import { safeName, validateEmail, validateNationalId, validatePassword, validateRole } from "../validators.ts";

export async function createUser({ admin, body, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const { email, password } = body;
  validateEmail(email);
  validatePassword(password);
  if (body.role) validateRole(body.role);
  if (body.nationalId) validateNationalId(body.nationalId);

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  if (body.role) {
    const { error: roleError } = await admin.from("user_roles").insert({
      user_id: newUser.user.id,
      role: body.role,
    });
    if (roleError) {
      await admin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("فشل تعيين الدور");
    }
  }

  if (body.role === "beneficiary") {
    const { data: existingBeneficiary } = await admin
      .from("beneficiaries")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingBeneficiary) {
      const updateData: Record<string, unknown> = { user_id: newUser.user.id };
      if (body.nationalId) updateData.national_id = body.nationalId;
      if (body.name) updateData.name = body.name;
      const { error: benError } = await admin
        .from("beneficiaries")
        .update(updateData)
        .eq("id", existingBeneficiary.id);
      if (benError) {
        await admin.from("user_roles").delete().eq("user_id", newUser.user.id);
        await admin.auth.admin.deleteUser(newUser.user.id);
        throw new Error("فشل تحديث بيانات المستفيد");
      }
    } else {
      const { error: benError } = await admin.from("beneficiaries").insert({
        name: body.name || email.split("@")[0],
        email,
        share_percentage: 0,
        user_id: newUser.user.id,
        national_id: body.nationalId || null,
      });
      if (benError) {
        await admin.from("user_roles").delete().eq("user_id", newUser.user.id);
        await admin.auth.admin.deleteUser(newUser.user.id);
        throw new Error("فشل إنشاء المستفيد");
      }
    }
  } else if (body.nationalId) {
    const { data: beneficiary } = await admin
      .from("beneficiaries")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (beneficiary) {
      await admin
        .from("beneficiaries")
        .update({ national_id: body.nationalId, user_id: newUser.user.id })
        .eq("id", beneficiary.id);
    }
  }

  if (body.role === "beneficiary") {
    try {
      await admin.rpc("notify_admins", {
        p_title: "مستفيد جديد",
        p_message: `تم تسجيل مستفيد جديد: ${safeName(body.name || email)}`,
        p_type: "info",
        p_link: "/dashboard/beneficiaries",
      });
    } catch { /* إشعار فشل — غير حرج */ }
  }

  return ok({ success: true, user: { id: newUser.user.id, email: newUser.user.email } }, corsHeaders);
}
