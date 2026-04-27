import { ok, type HandlerContext, type HandlerResult } from "./types.ts";
import { validatePassword, validateUuid } from "../validators.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export async function updatePassword({ admin, body, corsHeaders }: HandlerContext): Promise<HandlerResult> {
  const { userId, password } = body;
  validateUuid(userId);
  validatePassword(password);

  // 1) تحديث كلمة المرور
  const { data: updResult, error: updError } = await admin.auth.admin.updateUserById(userId, { password });
  if (updError) {
    console.error("update_password: operation failed");
    if (updError.message?.includes("banned") || updError.message?.includes("pwned") || updError.message?.includes("compromised")) {
      throw new Error("كلمة المرور مرفوضة لأنها شائعة أو مُسربة — اختر كلمة مرور أقوى");
    }
    throw updError;
  }

  // 2) تحقق تجريبي: محاولة تسجيل دخول بالبيانات الجديدة
  const userEmail = updResult?.user?.email;
  if (userEmail) {
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
      body: JSON.stringify({ email: userEmail, password }),
    });

    if (!verifyRes.ok) {
      await verifyRes.text();
      console.error("update_password: verification failed", verifyRes.status);
      throw new Error("فشل تحديث كلمة المرور — قد تكون كلمة المرور مرفوضة من نظام الحماية. جرّب كلمة مرور أطول وأكثر تعقيداً");
    }

    const verifyData = await verifyRes.json();
    if (verifyData.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${verifyData.access_token}`,
        },
      }).catch(() => { /* تجاهل أخطاء تسجيل الخروج */ });
    }
  }

  return ok({ success: true, verified: !!userEmail }, corsHeaders);
}
