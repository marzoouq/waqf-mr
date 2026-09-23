/**
 * اختبارات helpers لـ webauthn — تحقق من قيود rpID/origin وترميز Base64.
 * دوال نقية فقط؛ لا شبكة ولا مفاتيح.
 */
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fromBase64, getRpInfo, toBase64 } from "./helpers.ts";

const reqWithOrigin = (origin?: string): Request =>
  new Request("https://example.test/webauthn", {
    method: "POST",
    headers: origin ? { Origin: origin } : {},
  });

Deno.test("getRpInfo يستخرج rpID من النطاق الرسمي المسموح", () => {
  const info = getRpInfo(reqWithOrigin("https://waqf-wise.net"));
  assertEquals(info.rpID, "waqf-wise.net");
  assertEquals(info.origin, "https://waqf-wise.net");
  assertEquals(info.rpName, "نظام إدارة الوقف");
});

Deno.test("getRpInfo يعتمد النطاق الرسمي عند غياب ترويسة Origin", () => {
  const info = getRpInfo(reqWithOrigin());
  assertEquals(info.rpID, "waqf-wise.net");
});

Deno.test("getRpInfo يسمح بنطاق المعاينة المطابق لنمط المشروع", () => {
  const origin = "https://id-preview--29470216-3df1-468f-b021-5c98b75b2920.lovable.app";
  assertEquals(getRpInfo(reqWithOrigin(origin)).rpID, new URL(origin).hostname);
});

Deno.test("getRpInfo يسمح بالتطوير المحلي", () => {
  assertEquals(getRpInfo(reqWithOrigin("http://localhost:8080")).rpID, "localhost");
});

Deno.test("getRpInfo يرفض أي origin خارج القائمة البيضاء", () => {
  for (const bad of [
    "https://evil.example",
    "https://waqf-wise.net.attacker.com",
    "https://29470216-3df1-468f-b021-5c98b75b2920.lovable.app.evil.com",
    "http://waqf-wise.net",
  ]) {
    assertThrows(
      () => getRpInfo(reqWithOrigin(bad)),
      Error,
      "Origin غير مسموح به",
      `يجب رفض ${bad}`,
    );
  }
});

Deno.test("getRpInfo يرفض نطاق مشروع lovable آخر", () => {
  assertThrows(() =>
    getRpInfo(reqWithOrigin("https://11111111-2222-3333-4444-555555555555.lovable.app"))
  );
});

Deno.test("toBase64/fromBase64 رحلة ذهاب وعودة دقيقة", () => {
  const bytes = new Uint8Array([0, 1, 2, 127, 128, 200, 255]);
  const roundTripped = fromBase64(toBase64(bytes));
  assertEquals(Array.from(roundTripped), Array.from(bytes));
});

Deno.test("toBase64 يتعامل مع مصفوفة فارغة", () => {
  assertEquals(toBase64(new Uint8Array()), "");
  assertEquals(fromBase64("").length, 0);
});

Deno.test("toBase64 يعطي ترميزاً قياسياً معروفاً", () => {
  const bytes = new TextEncoder().encode("waqf");
  assertEquals(toBase64(bytes), btoa("waqf"));
});
