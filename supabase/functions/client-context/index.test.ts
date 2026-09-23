/**
 * اختبارات client-context — سياق الزائر (IP + حالة الحجب).
 * تتحقق من شكل الرد والسلوك fail-open وأن الوظيفة لا تسرّب بيانات إضافية.
 */
import { loadSync } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

loadSync({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/client-context`;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${ANON_KEY}`,
};

Deno.test("الوظيفة منشورة وتُرجع سياقاً صالحاً", async () => {
  const res = await fetch(FUNCTION_URL, { method: "POST", headers });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(typeof body.blocked, "boolean");
  assert("ip" in body, "يجب إرجاع حقل ip كي لا تفقد السجلات مصدرها");
  assert("reason" in body);
});

Deno.test("تعمل قبل تسجيل الدخول (لا تتطلب جلسة مستخدم)", async () => {
  const res = await fetch(FUNCTION_URL, { method: "POST", headers });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.blocked, false);
});

Deno.test("تستجيب لطلب OPTIONS (CORS preflight)", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:8080", "Access-Control-Request-Method": "POST" },
  });
  await res.text();
  assert(res.status < 400, `OPTIONS يجب ألا يفشل، got ${res.status}`);
});

Deno.test("لا تُرجع حقولاً حساسة إضافية", async () => {
  const res = await fetch(FUNCTION_URL, { method: "POST", headers });
  const body = await res.json();
  const allowed = new Set(["ip", "blocked", "reason"]);
  for (const key of Object.keys(body)) {
    assert(allowed.has(key), `حقل غير متوقع في الرد: ${key}`);
  }
});

Deno.test("لا تقبل ترويسة IP مُزيَّفة من العميل لتجاوز الحجب", async () => {
  // الوكيل يعيد كتابة x-forwarded-for؛ نتحقق أن الرد لا يعكس القيمة المزيّفة حرفياً
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { ...headers, "x-forwarded-for": "127.0.0.1" },
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.ip === "127.0.0.1", false, "لا يجوز الوثوق بترويسة العميل كعنوان نهائي");
});
