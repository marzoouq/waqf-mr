// اختبارات أمنية لـ isServiceRole — يجب رفض JWT المزوّر وقبول المفتاح الحقيقي فقط.
// MOCK_KEY: قيمة وهمية لبيئة الاختبار فقط — ليست مفتاحاً حقيقياً.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const MOCK_KEY = "mock-service-role-key-12345-abcdef";
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", MOCK_KEY);
Deno.env.set("SUPABASE_URL", "http://localhost");
Deno.env.set("SUPABASE_ANON_KEY", "anon");

const { isServiceRole } = await import("./auth.ts");

// JWT مزوّر بـ role=service_role لكن غير موقَّع — يجب رفضه
function forgedServiceRoleJwt(): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ role: "service_role", iss: "attacker" }));
  return `${header}.${payload}.fakesig`;
}

Deno.test("isServiceRole rejects forged JWT claiming service_role", () => {
  assertEquals(isServiceRole(forgedServiceRoleJwt()), false);
});

Deno.test("isServiceRole rejects empty token", () => {
  assertEquals(isServiceRole(""), false);
});

Deno.test("isServiceRole rejects random string", () => {
  assertEquals(isServiceRole("not-a-jwt-at-all"), false);
});

Deno.test("isServiceRole accepts exact SERVICE_ROLE_KEY", () => {
  assertEquals(isServiceRole(REAL_KEY), true);
});

Deno.test("isServiceRole rejects key with extra char (constant-time mismatch)", () => {
  assertEquals(isServiceRole(REAL_KEY + "x"), false);
});

Deno.test("isServiceRole rejects key prefix", () => {
  assertEquals(isServiceRole(REAL_KEY.slice(0, -1)), false);
});
