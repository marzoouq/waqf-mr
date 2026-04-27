import { ok, type HandlerContext, type HandlerResult } from "./types.ts";
import { safeName } from "../validators.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BULK = 50;

export async function bulkCreateUsers({ admin, body, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const { users } = body;
  if (!users || !Array.isArray(users) || users.length === 0) {
    throw new Error("users array is required");
  }
  if (users.length > MAX_BULK) {
    throw new Error("Maximum 50 users at a time");
  }

  const results: { email: string; userId: string; success: boolean }[] = [];
  const errors: { email: string; error: string }[] = [];

  for (const u of users) {
    if (!u.email || typeof u.email !== "string" || !EMAIL_RE.test(u.email) || u.email.length > 255) {
      errors.push({ email: u.email || "missing", error: "Invalid or missing email" });
      continue;
    }
    if (!u.password || typeof u.password !== "string" || u.password.length < 8 || u.password.length > 128) {
      errors.push({ email: u.email, error: "كلمة المرور يجب أن تكون بين 8 و128 حرفاً" });
      continue;
    }
    if (!u.name || typeof u.name !== "string" || u.name.trim().length === 0 || u.name.length > 200) {
      errors.push({ email: u.email, error: "Invalid or missing name" });
      continue;
    }

    try {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (createError) {
        errors.push({ email: u.email, error: "فشل إنشاء المستخدم" });
        continue;
      }

      const { error: roleError } = await admin.from("user_roles").insert({
        user_id: newUser.user.id,
        role: "beneficiary",
      });
      if (roleError) {
        await admin.auth.admin.deleteUser(newUser.user.id);
        errors.push({ email: u.email, error: "فشل تعيين الدور" });
        continue;
      }

      const { error: benError } = await admin.from("beneficiaries").insert({
        name: u.name,
        email: u.email,
        share_percentage: 0,
        user_id: newUser.user.id,
        national_id: u.national_id || null,
      });
      if (benError) {
        await admin.from("user_roles").delete().eq("user_id", newUser.user.id);
        await admin.auth.admin.deleteUser(newUser.user.id);
        errors.push({ email: u.email, error: "فشل إنشاء المستفيد" });
        continue;
      }

      try {
        await admin.rpc("notify_admins", {
          p_title: "مستفيد جديد",
          p_message: `تم تسجيل مستفيد جديد: ${safeName(u.name)}`,
          p_type: "info",
          p_link: "/dashboard/beneficiaries",
        });
      } catch { /* إشعار فشل — غير حرج */ }

      results.push({ email: u.email, userId: newUser.user.id, success: true });
    } catch {
      errors.push({ email: u.email, error: "خطأ غير متوقع" });
    }
  }

  return ok({
    success: true,
    created: results.length,
    failed: errors.length,
    results,
    errors,
  }, corsHeaders);
}
