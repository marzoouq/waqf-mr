// ═══════════════════════════════════════════════════════════════════════════════
// admin-manage-users — إدارة المستخدمين والأدوار (admin فقط)
// ───────────────────────────────────────────────────────────────────────────────
// الهيكل:
//   - index.ts          ← HTTP handler + dispatch
//   - validators.ts     ← تحقق المدخلات
//   - handlers/*.ts     ← منطق كل إجراء (action) منفصل
// ═══════════════════════════════════════════════════════════════════════════════

import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { ALLOWED_ACTIONS, type AdminAction } from "./validators.ts";
import { json, type HandlerContext } from "./handlers/types.ts";
import { toggleRegistration } from "./handlers/toggle-registration.ts";
import { listUsers } from "./handlers/list-users.ts";
import { updateEmail } from "./handlers/update-email.ts";
import { updatePassword } from "./handlers/update-password.ts";
import { confirmEmail } from "./handlers/confirm-email.ts";
import { setRole } from "./handlers/set-role.ts";
import { deleteUser } from "./handlers/delete-user.ts";
import { createUser } from "./handlers/create-user.ts";
import { bulkCreateUsers } from "./handlers/bulk-create-users.ts";

type Handler = (ctx: HandlerContext) => Promise<Response>;

const handlers: Record<AdminAction, Handler> = {
  toggle_registration: toggleRegistration,
  list_users: listUsers,
  update_email: updateEmail,
  update_password: updatePassword,
  confirm_email: confirmEmail,
  set_role: setRole,
  delete_user: deleteUser,
  create_user: createUser,
  bulk_create_users: bulkCreateUsers,
};

Deno.serve(async (req): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1) المصادقة + تحليل الجسم بالتوازي
    const [auth, body] = await Promise.all([
      authenticate(req, corsHeaders, {
        allowedRoles: ["admin"],
        rateLimitKey: "admin-manage",
        rateLimit: 60,
        rateLimitWindowSeconds: 60,
      }),
      req.json().catch(() => ({})),
    ]);
    if ("error" in auth) return auth.error;
    const { user, admin } = auth;

    // 2) Validate action
    const action = body.action as string | undefined;
    if (!action || !ALLOWED_ACTIONS.includes(action as AdminAction)) {
      return json({ error: "إجراء غير صالح" }, 400, corsHeaders);
    }

    // 3) Dispatch
    const handler = handlers[action as AdminAction];
    return await handler({ admin, callerId: user.id, body, corsHeaders });
  } catch (error) {
    const msg = (error as Error).message;
    console.error("admin-manage-users: request failed");
    // تعقيم رسالة الخطأ — لا نكشف تفاصيل DB الداخلية للمتصفح
    const safeMessages: Record<string, string> = {
      "email and password required": "البريد وكلمة المرور مطلوبان",
      "userId and role required": "معرف المستخدم والدور مطلوبان",
      "users array is required": "قائمة المستخدمين مطلوبة",
      "Maximum 50 users at a time": "الحد الأقصى 50 مستخدماً في المرة",
    };
    const safeMsg = safeMessages[msg]
      || (msg.startsWith("دور غير صالح") || msg.startsWith("لا يمكنك") || msg.startsWith("البريد") || msg.startsWith("كلمة المرور") || msg.startsWith("رقم الهوية") || msg.startsWith("فشل تحديث كلمة") ? msg : "حدث خطأ في العملية");
    return json({ error: safeMsg }, 400, corsHeaders);
  }
});
