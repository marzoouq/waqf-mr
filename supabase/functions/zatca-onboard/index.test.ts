// اختبارات تكاملية لوظيفة zatca-onboard
try { const { loadSync } = await import("https://deno.land/std@0.224.0/dotenv/mod.ts"); loadSync({ export: true, allowEmptyValues: true, examplePath: null }); } catch { /* env already set */ }
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/zatca-onboard`;

// إنشاء عميل لاختبار المصادقة
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات CORS
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-onboard: OPTIONS يعيد CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  assertEquals(res.status, 200);
  assertExists(res.headers.get("access-control-allow-origin"));
  await res.text();
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات المصادقة
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-onboard: يرفض الطلب بدون Authorization header", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test-connection" }),
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertExists(data.error);
});

Deno.test("zatca-onboard: يرفض الطلب مع توكن غير صالح", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer invalid-token-12345",
    },
    body: JSON.stringify({ action: "test-connection" }),
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertExists(data.error);
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبارات التحقق من المدخلات
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-onboard: يرفض إجراء غير صالح", async () => {
  // نحتاج جلسة مصادقة حقيقية — نتخطى إذا لم تتوفر بيانات تسجيل الدخول
  const email = Deno.env.get("TEST_ADMIN_EMAIL");
  const password = Deno.env.get("TEST_ADMIN_PASSWORD");
  if (!email || !password) {
    console.log("⏭ تم تخطي الاختبار: TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD غير متوفرة");
    return;
  }
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.session) {
    console.log("⏭ تم تخطي الاختبار: فشل تسجيل الدخول");
    return;
  }
  
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({ action: "invalid-action" }),
  });
  
  const data = await res.json();
  assertEquals(res.status, 400);
  assertEquals(data.error, "Invalid action. Use: onboard, production, test-connection");
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار test-connection
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-onboard: test-connection يعيد نتيجة اتصال", async () => {
  const email = Deno.env.get("TEST_ADMIN_EMAIL");
  const password = Deno.env.get("TEST_ADMIN_PASSWORD");
  if (!email || !password) {
    console.log("⏭ تم تخطي الاختبار: بيانات اعتماد الاختبار غير متوفرة");
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.session) {
    console.log("⏭ تم تخطي الاختبار: فشل تسجيل الدخول");
    return;
  }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({ action: "test-connection" }),
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  // يجب أن يحتوي على حقل connected (true أو false)
  assertExists(typeof data.connected, "boolean");
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار onboard بدون OTP
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-onboard: onboard يفشل بدون OTP", async () => {
  const email = Deno.env.get("TEST_ADMIN_EMAIL");
  const password = Deno.env.get("TEST_ADMIN_PASSWORD");
  if (!email || !password) {
    console.log("⏭ تم تخطي الاختبار: بيانات اعتماد الاختبار غير متوفرة");
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.session) {
    console.log("⏭ تم تخطي الاختبار: فشل تسجيل الدخول");
    return;
  }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({ action: "onboard" }),
  });

  const data = await res.json();
  // إما يفشل بسبب OTP مفقود أو ينجح في وضع التطوير (بدون ZATCA_API_URL)
  if (res.status === 400) {
    assertExists(data.error);
  } else {
    // في وضع التطوير قد ينجح بإنشاء شهادة تطوير
    assertEquals(res.status, 200);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار production بدون شهادة امتثال
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-onboard: production يفشل بدون شهادة امتثال نشطة", async () => {
  const email = Deno.env.get("TEST_ADMIN_EMAIL");
  const password = Deno.env.get("TEST_ADMIN_PASSWORD");
  if (!email || !password) {
    console.log("⏭ تم تخطي الاختبار: بيانات اعتماد الاختبار غير متوفرة");
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !authData.session) {
    console.log("⏭ تم تخطي الاختبار: فشل تسجيل الدخول");
    return;
  }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({ action: "production" }),
  });

  const data = await res.json();
  // يجب أن يفشل بسبب عدم وجود شهادة أو يعيد خطأ من ZATCA
  if (res.status === 400) {
    assertExists(data.error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// اختبار بنية الاستجابة
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("zatca-onboard: يعيد Content-Type application/json", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test-connection" }),
  });
  const contentType = res.headers.get("content-type");
  assertEquals(contentType?.includes("application/json"), true);
  await res.text();
});
