/**
 * اختبارات invoice-file-url — البوابة الوحيدة لتنزيل الفواتير.
 * قسم أول: تحقق المدخلات (نقي). قسم ثانٍ: تحقق المصادقة على الدالة المنشورة.
 */
import { loadSync } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { BodySchema, SIGNED_URL_TTL } from "./validation.ts";

loadSync({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/invoice-file-url`;

// ── تحقق المدخلات ───────────────────────────────────────────────────────────
Deno.test("يقبل مساراً صالحاً داخل الحاوية", () => {
  const r = BodySchema.safeParse({ file_path: "2026/INV-1001.pdf" });
  assertEquals(r.success, true);
});

Deno.test("يرفض path traversal (..)", () => {
  assertEquals(BodySchema.safeParse({ file_path: "../secrets/key.pem" }).success, false);
  assertEquals(BodySchema.safeParse({ file_path: "2026/../../etc/passwd" }).success, false);
});

Deno.test("يرفض المسار المطلق", () => {
  assertEquals(BodySchema.safeParse({ file_path: "/etc/passwd" }).success, false);
});

Deno.test("يرفض الشرطة المائلة العكسية (Windows traversal)", () => {
  assertEquals(BodySchema.safeParse({ file_path: "2026\\..\\x.pdf" }).success, false);
});

Deno.test("يرفض المسار الفارغ أو الطويل جداً", () => {
  assertEquals(BodySchema.safeParse({ file_path: "" }).success, false);
  assertEquals(BodySchema.safeParse({ file_path: "a".repeat(301) }).success, false);
});

Deno.test("يرفض غياب file_path", () => {
  assertEquals(BodySchema.safeParse({}).success, false);
});

Deno.test("يرفض اسم تنزيل طويل جداً", () => {
  const r = BodySchema.safeParse({ file_path: "2026/a.pdf", download: "d".repeat(201) });
  assertEquals(r.success, false);
});

Deno.test("عمر الرابط الموقّع قصير (دقيقتان أو أقل)", () => {
  assert(SIGNED_URL_TTL > 0 && SIGNED_URL_TTL <= 120);
});

// ── تحقق خادمي على الدالة المنشورة ──────────────────────────────────────────
Deno.test("يرفض الطلب بدون رمز مصادقة", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ file_path: "2026/INV-1001.pdf" }),
  });
  const body = await res.json().catch(() => ({}));
  assertEquals([401, 403, 429].includes(res.status), true, `status=${res.status}`);
  assert(body.url === undefined, "لا يجوز إرجاع رابط لمستخدم غير مصادق");
});

Deno.test("يرفض رمز مصادقة مزوّر", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.fake",
    },
    body: JSON.stringify({ file_path: "2026/INV-1001.pdf" }),
  });
  const body = await res.json().catch(() => ({}));
  assertEquals([401, 403, 429].includes(res.status), true, `status=${res.status}`);
  assert(body.url === undefined, "لا يجوز إرجاع رابط لرمز مزوّر");
});

Deno.test("لا يسرّب رابطاً موقّعاً لمسار خارج الحاوية", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ file_path: "../../storage/private.pdf" }),
  });
  const body = await res.json().catch(() => ({}));
  assert(res.status >= 400, `Expected 4xx, got ${res.status}`);
  assert(body.url === undefined);
});
