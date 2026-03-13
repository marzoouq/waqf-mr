import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/guard-signup`;

Deno.test("guard-signup: يرفض طلب بدون body", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertExists(body.error);
});

Deno.test("guard-signup: يرفض بريد إلكتروني غير صالح", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ email: "not-an-email", password: "12345678" }),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.error, "بريد إلكتروني غير صالح");
});

Deno.test("guard-signup: يرفض كلمة مرور قصيرة", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ email: "test@example.com", password: "123" }),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.error, "كلمة المرور يجب أن تكون بين 8 و 128 حرفاً");
});

Deno.test("guard-signup: يرفض طريقة GET", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  const body = await res.json();
  assertEquals(res.status, 405);
  assertEquals(body.error, "Method not allowed");
});

Deno.test("guard-signup: يتعامل مع التسجيل المعطل أو الصالح", async () => {
  // هذا الاختبار يتحقق من أن الدالة ترد بشكل صحيح
  // قد تكون النتيجة 403 (التسجيل معطل) أو 200 (نجاح) أو 400 (بريد مكرر)
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      email: `test-${Date.now()}@test-waqf.com`,
      password: "TestPassword123!",
    }),
  });
  const body = await res.json();
  // يجب أن يكون الرد إما نجاح أو خطأ معروف — ليس 500
  assertEquals(res.status !== 500, true, `Unexpected 500: ${JSON.stringify(body)}`);
  assertExists(body);
});
