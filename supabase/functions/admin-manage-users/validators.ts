// ═══════════════════════════════════════════════════════════════════════════════
// validators.ts — تحقق مدخلات admin-manage-users (Zod + helpers قديمة)
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "npm:zod@3";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NID_RE = /^\d{10}$/;
const ALLOWED_ROLES = ["admin", "beneficiary", "waqif", "accountant"] as const;

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
  if (!ALLOWED_ROLES.includes(r as typeof ALLOWED_ROLES[number])) throw new Error("دور غير صالح");
}

export function validateNationalId(nid: unknown) {
  if (nid && (typeof nid !== "string" || !NID_RE.test(nid))) throw new Error("رقم الهوية يجب أن يكون 10 أرقام");
}

/** Sanitize user-provided name to prevent injection in notification messages. */
export const safeName = (name: string) => name.substring(0, 100).replace(/[<>&"']/g, "");

export const ALLOWED_ACTIONS = [
  "toggle_registration", "list_users", "update_email", "update_password",
  "confirm_email", "set_role", "delete_user", "create_user", "bulk_create_users",
  "link_beneficiary",
] as const;

export type AdminAction = typeof ALLOWED_ACTIONS[number];

// ─── Zod body schema موحّد (Edge Functions Zod Required) ──────────────────────
// نتحقق من شكل الجسم على مستوى dispatch قبل تمرير `body` للـ handlers،
// وكل handler يحتفظ بفحوصاته الداخلية كـ defense in depth.
const Uuid = z.string().regex(UUID_RE, "معرف غير صالح");
const Email = z.string().trim().min(1).max(255).regex(EMAIL_RE, "صيغة البريد الإلكتروني غير صالحة");
const Password = z.string().min(8).max(128, "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
const Role = z.enum(ALLOWED_ROLES);
const NationalId = z.string().regex(NID_RE, "رقم الهوية يجب أن يكون 10 أرقام");

export const AdminBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("toggle_registration"), enabled: z.boolean().optional() }).passthrough(),
  z.object({ action: z.literal("list_users") }).passthrough(),
  z.object({ action: z.literal("update_email"), userId: Uuid, email: Email }).passthrough(),
  z.object({ action: z.literal("update_password"), userId: Uuid, password: Password }).passthrough(),
  z.object({ action: z.literal("confirm_email"), userId: Uuid }).passthrough(),
  z.object({ action: z.literal("set_role"), userId: Uuid, role: Role }).passthrough(),
  z.object({ action: z.literal("delete_user"), userId: Uuid }).passthrough(),
  z.object({
    action: z.literal("create_user"),
    email: Email,
    password: Password,
    role: Role.optional(),
    full_name: z.string().max(200).optional(),
    national_id: NationalId.optional(),
  }).passthrough(),
  z.object({
    action: z.literal("bulk_create_users"),
    users: z.array(z.unknown()).min(1, "قائمة المستخدمين مطلوبة").max(50, "الحد الأقصى 50 مستخدماً في المرة"),
  }).passthrough(),
  z.object({ action: z.literal("link_beneficiary"), userId: Uuid, beneficiary_id: Uuid }).passthrough(),
]);

export type AdminBody = z.infer<typeof AdminBodySchema>;

