// اختبارات تكاملية لوظيفة zatca-renew
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/zatca-renew`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

Deno.test("zatca-renew: OPTIONS يعيد CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  assertEquals(res.status, 200);
  assertExists(res.headers.get("access-control-allow-origin"));
  await res.text();
});

Deno.test("zatca-renew: يرفض الطلب بدون Authorization", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertExists(data.error);
});

Deno.test("zatca-renew: يرفض توكن غير صالح", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid-jwt-token",
    },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 401);
  await res.text();
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات التحقق من المتطلبات
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-renew: يفشل بدون OTP", async () => {
  const token = await getAdminToken();
  if (!token) { console.log("⏭ تم تخطي الاختبار: بيانات اعتماد الاختبار غير متوفرة"); return; }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  const data = await res.json();
  // إما 400 (لا بوابة ZATCA أو لا OTP) أو خطأ آخر
  assertEquals(res.status, 400);
  assertExists(data.error);
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار بنية الاستجابة
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-renew: يعيد Content-Type application/json", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assertEquals(res.headers.get("content-type")?.includes("application/json"), true);
  await res.text();
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار أمان — مستخدم غير مسؤول
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-renew: يرفض طلب من مستخدم غير مسؤول", async () => {
  const testEmail = Deno.env.get("TEST_BENEFICIARY_EMAIL");
  const testPassword = Deno.env.get("TEST_BENEFICIARY_PASSWORD");
  if (!testEmail || !testPassword) {
    console.log("⏭ تم تخطي الاختبار: بيانات اعتماد المستفيد غير متوفرة");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword });
  if (error || !data.session) {
    console.log("⏭ تم تخطي الاختبار: فشل تسجيل دخول المستفيد");
    return;
  }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({}),
  });

  const resData = await res.json();
  // يجب أن يُرفض لعدم وجود صلاحية admin
  assertEquals(res.status, 403);
  assertExists(resData.error);
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار POST فارغ
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-renew: POST بدون body يعيد خطأ مناسب", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  // يجب أن يعيد خطأ (401 أو 500)
  assertEquals(res.status >= 400, true);
  await res.text();
});
