/**
 * عقد الحماية المشترك لكل دوال الحافة المميّزة.
 * قاعدة واحدة: أي وظيفة تقرأ أو تنتج بيانات وقفية يجب ألا تُرجع 200 دون مصادقة مستخدم.
 * مكتوبة كجدول واحد لمنع تكرار نفس الاختبار في 15 ملفاً (بوابة jscpd).
 */
import { loadSync } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

loadSync({ export: true, allowEmptyValues: true, examplePath: null });

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

/** وظائف تتطلب جلسة مستخدم حقيقية — anon key وحده لا يكفي. */
const PROTECTED_FUNCTIONS = [
  "dashboard-summary",
  "multi-year-summary",
  "year-comparison-summary",
  "beneficiary-summary",
  "generate-invoice-pdf",
  "generate-voucher-pdf",
  "invoice-file-url",
  "admin-manage-users",
  "email-admin",
  "ai-assistant",
  "check-contract-expiry",
  "diagnostics-edge-ping",
  "lookup-national-id",
];

/** حالات مقبولة للرفض: مصادقة/صلاحية/حد معدل. 400 مقبولة فقط إن كان التحقق من المدخلات أولاً. */
const REJECT_STATUSES = [400, 401, 403, 405, 429];

async function callWithoutSession(name: string, headers: Record<string, string>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({}),
  });
  const text = await res.text();
  return { status: res.status, text };
}

for (const name of PROTECTED_FUNCTIONS) {
  Deno.test(`${name}: يرفض الطلب بمفتاح anon فقط (بلا جلسة مستخدم)`, async () => {
    const { status, text } = await callWithoutSession(name, {
      Authorization: `Bearer ${ANON_KEY}`,
    });
    assert(
      REJECT_STATUSES.includes(status),
      `${name} أرجع ${status} بدل الرفض — الرد: ${text.slice(0, 200)}`,
    );
  });

  Deno.test(`${name}: يرفض الطلب بدون أي ترويسة تفويض`, async () => {
    const { status, text } = await callWithoutSession(name, {});
    assert(
      REJECT_STATUSES.includes(status),
      `${name} أرجع ${status} بدون تفويض — الرد: ${text.slice(0, 200)}`,
    );
  });

  Deno.test(`${name}: يرفض رمزاً مزوّراً`, async () => {
    const { status, text } = await callWithoutSession(name, {
      Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.ZmFrZQ.ZmFrZXNpZw",
    });
    assert(
      REJECT_STATUSES.includes(status),
      `${name} أرجع ${status} لرمز مزوّر — الرد: ${text.slice(0, 200)}`,
    );
  });

  Deno.test(`${name}: لا يسرّب أسراراً أو تتبّعاً داخلياً في رسالة الخطأ`, async () => {
    const { text } = await callWithoutSession(name, { Authorization: `Bearer ${ANON_KEY}` });
    const leaks = [
      "SERVICE_ROLE",
      "service_role",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      "postgres://",
      "/home/deno",
      "LOVABLE_API_KEY",
    ];
    for (const needle of leaks) {
      assertEquals(
        text.includes(needle),
        false,
        `${name} سرّب "${needle}" في رد الخطأ`,
      );
    }
  });
}

Deno.test("health-check: عامة وتُرجع الحالة فقط دون تفاصيل داخلية", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
    method: "GET",
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  });
  const body = await res.json();
  assert([200, 503].includes(res.status), `حالة غير متوقعة: ${res.status}`);
  assert(["healthy", "degraded"].includes(body.status));
  assertEquals(Object.keys(body).sort().join(","), "status,timestamp");
});

Deno.test("health-check: تستجيب لـ OPTIONS دون مصادقة", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:8080", "Access-Control-Request-Method": "GET" },
  });
  await res.text();
  assert(res.status < 400, `OPTIONS فشل بحالة ${res.status}`);
});

Deno.test("CORS: لا تُمنح ترويسة السماح لأصل خارجي", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "GET" },
  });
  await res.text();
  const allow = res.headers.get("access-control-allow-origin");
  assertEquals(allow === "https://evil.example", false, "تم السماح لأصل غير موثوق");
  assertEquals(allow === "*", false, "السماح المفتوح ممنوع");
});
