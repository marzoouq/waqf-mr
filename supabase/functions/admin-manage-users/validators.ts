// ═══════════════════════════════════════════════════════════════════════════════
// validators.ts — تحقق مدخلات admin-manage-users
// ═══════════════════════════════════════════════════════════════════════════════

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NID_RE = /^\d{10}$/;
const ALLOWED_ROLES = ["admin", "beneficiary", "waqif", "accountant"];

export function validateEmail(e: unknown): asserts e is string {
  if (!e || typeof e !== "string" || e.length > 255) throw new Error("بريد إلكتروني غير صالح");
  if (!EMAIL_RE.test(e)) throw new Error("صيغة البريد الإلكتروني غير صالحة");
}

export function validatePassword(p: unknown): asserts p is string {
  if (!p || typeof p !== "string" || p.length < 8 || p.length > 128) {
    throw new Error("كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
  }
}

export function validateUuid(id: unknown): asserts id is string {
  if (!id || typeof id !== "string" || !UUID_RE.test(id)) throw new Error("معرف غير صالح");
}

export function validateRole(r: unknown): asserts r is string {
  if (!ALLOWED_ROLES.includes(r as string)) throw new Error("دور غير صالح");
}

export function validateNationalId(nid: unknown) {
  if (nid && (typeof nid !== "string" || !NID_RE.test(nid))) throw new Error("رقم الهوية يجب أن يكون 10 أرقام");
}

/** Sanitize user-provided name to prevent injection in notification messages. */
export const safeName = (name: string) => name.substring(0, 100).replace(/[<>&"']/g, "");

export const ALLOWED_ACTIONS = [
  "toggle_registration", "list_users", "update_email", "update_password",
  "confirm_email", "set_role", "delete_user", "create_user", "bulk_create_users",
] as const;

export type AdminAction = typeof ALLOWED_ACTIONS[number];
