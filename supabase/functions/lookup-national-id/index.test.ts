/**
 * اختبارات وحدة نقية لمنطق التحقق في lookup-national-id.
 * لا تعتمد على الشبكة أو rate limit — تختبر السلوك الأمني الفعلي مباشرةً.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isValidSaudiNationalId,
  maskEmail,
  normalizeDigits,
  sha256Hex,
} from "./validation.ts";

// رقم صالح Luhn يبدأ بـ 1 (مواطن)
const VALID_CITIZEN_ID = "1000000008";

Deno.test("normalizeDigits تحوّل الأرقام العربية-الهندية إلى لاتينية", () => {
  assertEquals(normalizeDigits("٩٩٩٩٩٩٩٩٩٩"), "9999999999");
});

Deno.test("normalizeDigits تحوّل الأرقام الفارسية إلى لاتينية", () => {
  assertEquals(normalizeDigits("۱۲۳۴۵۶۷۸۹۰"), "1234567890");
});

Deno.test("normalizeDigits تُزيل المسافات المحيطة", () => {
  assertEquals(normalizeDigits("  ١٠٠٠٠٠٠٠٠٨  "), "1000000008");
});

Deno.test("isValidSaudiNationalId تقبل رقم مواطن صالح", () => {
  assertEquals(isValidSaudiNationalId(VALID_CITIZEN_ID), true);
});

Deno.test("isValidSaudiNationalId ترفض ما لا يبدأ بـ 1 أو 2", () => {
  assertEquals(isValidSaudiNationalId("9999999999"), false);
  assertEquals(isValidSaudiNationalId("3000000008"), false);
});

Deno.test("isValidSaudiNationalId ترفض الطول غير العشري", () => {
  assertEquals(isValidSaudiNationalId("12345"), false);
  assertEquals(isValidSaudiNationalId("10000000088"), false);
});

Deno.test("isValidSaudiNationalId ترفض الأحرف غير الرقمية", () => {
  assertEquals(isValidSaudiNationalId("10000000A8"), false);
  assertEquals(isValidSaudiNationalId(""), false);
});

Deno.test("isValidSaudiNationalId ترفض رقماً يفشل Luhn", () => {
  assertEquals(isValidSaudiNationalId("1000000009"), false);
});

Deno.test("التطبيع ثم التحقق يعملان معاً على مدخل عربي", () => {
  assertEquals(isValidSaudiNationalId(normalizeDigits("١٠٠٠٠٠٠٠٠٨")), true);
});

Deno.test("sha256Hex يُنتج 64 حرفاً hex ثابتاً", async () => {
  const hash = await sha256Hex(VALID_CITIZEN_ID);
  assertEquals(hash.length, 64);
  assert(/^[0-9a-f]{64}$/.test(hash));
  assertEquals(hash, await sha256Hex(VALID_CITIZEN_ID));
});

Deno.test("sha256Hex لا يحتوي على الرقم الأصلي (منع التسريب)", async () => {
  const hash = await sha256Hex(VALID_CITIZEN_ID);
  assertEquals(hash.includes(VALID_CITIZEN_ID), false);
});

Deno.test("maskEmail يُخفي معظم الجزء المحلي", () => {
  assertEquals(maskEmail("abdullah@example.com"), "abd***@example.com");
  assertEquals(maskEmail("a@example.com"), "a***@example.com");
});

Deno.test("maskEmail يرد قيمة محجوبة لمدخل غير بريدي", () => {
  assertEquals(maskEmail("not-an-email"), "***@***");
});
