/** اختبارات استخراج عنوان IP — أولوية الترويسات والحدود. */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractClientIp } from "./client-ip.ts";

const reqWith = (headers: Record<string, string>) =>
  new Request("https://example.test/", { headers });

Deno.test("يأخذ أول عنوان من x-forwarded-for", () => {
  assertEquals(
    extractClientIp(reqWith({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2" })),
    "203.0.113.5",
  );
});

Deno.test("x-forwarded-for له أولوية على cf-connecting-ip", () => {
  assertEquals(
    extractClientIp(reqWith({
      "x-forwarded-for": "203.0.113.5",
      "cf-connecting-ip": "198.51.100.9",
    })),
    "203.0.113.5",
  );
});

Deno.test("يرجع إلى cf-connecting-ip عند غياب x-forwarded-for", () => {
  assertEquals(extractClientIp(reqWith({ "cf-connecting-ip": "198.51.100.9" })), "198.51.100.9");
});

Deno.test("يرجع إلى x-real-ip كخيار أخير", () => {
  assertEquals(extractClientIp(reqWith({ "x-real-ip": "192.0.2.44" })), "192.0.2.44");
});

Deno.test("يُرجع null عند غياب كل الترويسات", () => {
  assertEquals(extractClientIp(reqWith({})), null);
});

Deno.test("يتجاهل x-forwarded-for الفارغ ولا يعيد سلسلة فارغة", () => {
  assertEquals(extractClientIp(reqWith({ "x-forwarded-for": "   " })), null);
});

Deno.test("يقصّ العناوين الطويلة إلى الحد الأقصى", () => {
  const long = "1".repeat(200);
  assertEquals(extractClientIp(reqWith({ "x-forwarded-for": long }))?.length, 64);
  assertEquals(extractClientIp(reqWith({ "x-real-ip": long }), 16)?.length, 16);
});

Deno.test("يُزيل المسافات المحيطة بالعنوان", () => {
  assertEquals(extractClientIp(reqWith({ "cf-connecting-ip": "  192.0.2.7  " })), "192.0.2.7");
});
