/**
 * اختبارات مدققات admin-manage-users — بوابة إدارة الحسابات والأدوار.
 */
import { loadSync } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ALLOWED_ACTIONS,
  AdminBodySchema,
  safeName,
  validateEmail,
  validateNationalId,
  validatePassword,
  validateRole,
  validateUuid,
} from "./validators.ts";

loadSync({ export: true, allowEmptyValues: true, examplePath: null });

const UUID = "11111111-2222-4333-8444-555555555555";

Deno.test("validateEmail يقبل بريداً صالحاً ويرفض غيره", () => {
  validateEmail("admin@waqf-wise.net");
  assertThrows(() => validateEmail("not-an-email"));
  assertThrows(() => validateEmail(""));
  assertThrows(() => validateEmail("a@b.c".padEnd(300, "x")));
  assertThrows(() => validateEmail(12345));
});

Deno.test("validatePassword يفرض 8 إلى 128 حرفاً", () => {
  validatePassword("TestPass123!");
  assertThrows(() => validatePassword("short"));
  assertThrows(() => validatePassword("x".repeat(129)));
});

Deno.test("validateUuid يرفض المعرفات المزيّفة", () => {
  validateUuid(UUID);
  assertThrows(() => validateUuid("1; DROP TABLE user_roles"));
  assertThrows(() => validateUuid("not-a-uuid"));
});

Deno.test("validateRole يقبل الأدوار الأربعة فقط", () => {
  for (const role of ["admin", "beneficiary", "waqif", "accountant"]) validateRole(role);
  assertThrows(() => validateRole("support"), Error, "دور غير صالح");
  assertThrows(() => validateRole("superadmin"));
  assertThrows(() => validateRole("service_role"));
});

Deno.test("validateNationalId يفرض عشرة أرقام عند وجوده", () => {
  validateNationalId(undefined);
  validateNationalId("1000000008");
  assertThrows(() => validateNationalId("12345"));
  assertThrows(() => validateNationalId("10000000A8"));
});

Deno.test("safeName يُزيل محارف الحقن ويحدّ الطول", () => {
  assertEquals(safeName('<script>alert("x")</script>'), "scriptalert(x)/script");
  assertEquals(safeName("ع".repeat(200)).length, 100);
});

Deno.test("AdminBodySchema يرفض إجراءً غير معروف", () => {
  assertEquals(AdminBodySchema.safeParse({ action: "grant_service_role" }).success, false);
  assertEquals(AdminBodySchema.safeParse({}).success, false);
});

Deno.test("AdminBodySchema يرفض set_role بدور غير مسموح", () => {
  assertEquals(
    AdminBodySchema.safeParse({ action: "set_role", userId: UUID, role: "support" }).success,
    false,
  );
  assertEquals(
    AdminBodySchema.safeParse({ action: "set_role", userId: UUID, role: "admin" }).success,
    true,
  );
});

Deno.test("AdminBodySchema يرفض update_password بكلمة مرور ضعيفة", () => {
  assertEquals(
    AdminBodySchema.safeParse({ action: "update_password", userId: UUID, password: "123" }).success,
    false,
  );
});

Deno.test("AdminBodySchema يرفض update_email بمعرّف غير صالح", () => {
  assertEquals(
    AdminBodySchema.safeParse({ action: "update_email", userId: "x", email: "a@b.co" }).success,
    false,
  );
});

Deno.test("قائمة الإجراءات مغلقة ولا تتضمن إجراءات خطرة", () => {
  assert(!ALLOWED_ACTIONS.includes("execute_sql" as never));
  assert(ALLOWED_ACTIONS.includes("set_role"));
});

Deno.test("الدالة المنشورة ترفض الطلب بدون مصادقة ناظر", async () => {
  const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage-users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ action: "list_users" }),
  });
  const body = await res.json().catch(() => ({}));
  assertEquals([401, 403, 429].includes(res.status), true, `status=${res.status}`);
  assertEquals(body.users, undefined, "لا يجوز تسريب قائمة المستخدمين");
});
