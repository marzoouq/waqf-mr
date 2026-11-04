import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// حارس: حزمة waqf-assets ترفض ملفات ttf، فيجب أن تملك وظيفة السند مصدرًا احتياطيًا للخط
const src = readFileSync("supabase/functions/generate-voucher-pdf/pdf-renderer.ts", "utf8");

describe("voucher PDF font sources", () => {
  it("falls back to the published site fonts", () => {
    expect(src).toContain("https://waqf-wise.net/fonts");
  });
  it("tries every source before failing", () => {
    expect(src).toMatch(/for \(const base of FONT_SOURCES\)/);
  });
});
