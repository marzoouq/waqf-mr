import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { amountToArabicWords } from "@/utils/format/arabicNumberWords";

// حارس: سند الصرف يجب أن يكون وثيقة رسمية (ترويسة، تاريخ مزدوج، تفقيط، ختم، إطار)
const renderer = readFileSync("supabase/functions/generate-voucher-pdf/pdf-renderer.ts", "utf8");
const index = readFileSync("supabase/functions/generate-voucher-pdf/index.ts", "utf8");

describe("official disbursement voucher", () => {
  it("prints the waqf header from settings", () => {
    expect(renderer).toContain("waqf.name");
    expect(renderer).toContain("waqf.deed_number");
    expect(index).toMatch(/from\("app_settings"\)/);
  });
  it("prints hijri and gregorian dates", () => {
    expect(renderer).toContain("formatHijriGregorian");
  });
  it("writes the amount in Arabic words", () => {
    expect(renderer).toContain("amountToArabicWords");
    expect(amountToArabicWords(8751.73)).toBe(
      "ثمانية آلاف وسبعمائة وواحد وخمسون ريالاً سعودياً وثلاثة وسبعون هللة فقط لا غير",
    );
  });
  it("draws the official stamp and page border", () => {
    expect(renderer).toContain("drawStamp(");
    expect(renderer).toContain("drawBorder(");
  });
});
