// اختبارات تكاملية لوظيفة zatca-report
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/zatca-report`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// مساعد لتسجيل الدخول كمسؤول
async function getAdminToken(): Promise<string | null> {
  const email = Deno.env.get("TEST_ADMIN_EMAIL");
  const password = Deno.env.get("TEST_ADMIN_PASSWORD");
  if (!email || !password) return null;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return data.session.access_token;
}

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات CORS والمصادقة
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-report: OPTIONS يعيد CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  assertEquals(res.status, 200);
  assertExists(res.headers.get("access-control-allow-origin"));
  await res.text();
});

Deno.test("zatca-report: يرفض الطلب بدون Authorization", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "report", invoice_id: "test", table: "invoices" }),
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertExists(data.error);
});

Deno.test("zatca-report: يرفض توكن غير صالح", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer fake-token",
    },
    body: JSON.stringify({ action: "report", invoice_id: "test", table: "invoices" }),
  });
  assertEquals(res.status, 401);
  await res.text();
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات التحقق من المدخلات
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-report: يرفض إجراء غير صالح", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "unknown-action" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertExists(data.error);
});

Deno.test("zatca-report: compliance-check يرفض بدون invoice_id", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "compliance-check" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertExists(data.error);
});

Deno.test("zatca-report: compliance-check يرفض جدول غير صالح", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "compliance-check", invoice_id: "test-id", table: "invalid_table" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertExists(data.error);
});

Deno.test("zatca-report: report يرفض بدون معاملات كافية", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "report" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertExists(data.error);
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات الفاتورة غير الموجودة
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-report: report يعيد خطأ لفاتورة غير موجودة", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "report", invoice_id: "00000000-0000-0000-0000-000000000000", table: "invoices" }),
  });

  const data = await res.json();
  // إما 400 (لا شهادة) أو 404 (فاتورة غير موجودة)
  assertEquals(res.status >= 400, true);
  assertExists(data.error);
});

Deno.test("zatca-report: clearance يعيد خطأ لفاتورة غير موجودة", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "clearance", invoice_id: "00000000-0000-0000-0000-000000000000", table: "invoices" }),
  });

  const data = await res.json();
  assertEquals(res.status >= 400, true);
  assertExists(data.error);
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات QR
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-report: compliance-buyer-qr يرفض بدون invoice_id", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "compliance-buyer-qr" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertExists(data.error);
});

Deno.test("zatca-report: compliance-seller-qr يرفض بدون table", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "compliance-seller-qr", invoice_id: "test" }),
  });

  assertEquals(res.status, 400);
  const data = await res.json();
  assertExists(data.error);
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار بنية الاستجابة
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-report: يعيد Content-Type application/json", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "report" }),
  });
  assertEquals(res.headers.get("content-type")?.includes("application/json"), true);
  await res.text();
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار payment_invoices
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-report: report يقبل جدول payment_invoices", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "report", invoice_id: "00000000-0000-0000-0000-000000000000", table: "payment_invoices" }),
  });

  const data = await res.json();
  // لن يعيد 400 بسبب "Invalid parameters"
  assertEquals(data.error !== "Invalid parameters", true);
});
