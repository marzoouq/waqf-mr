import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { docTypeFromFilename, verifyDocumentUrl } from "@/utils/pdf/core/officialRegistry";

// حارس: كل الوثائق المنزّلة مسجّلة برقم مرجعي ورمز تحقق، وسند الصرف يحمل QR
const renderer = readFileSync("supabase/functions/generate-voucher-pdf/pdf-renderer.ts", "utf8");
const voucherIndex = readFileSync("supabase/functions/generate-voucher-pdf/index.ts", "utf8");
const core = readFileSync("src/utils/pdf/core/core.ts", "utf8");
const routes = readFileSync("src/routes/publicRoutes.tsx", "utf8");
const migrations = readdirSync("drizzle/migrations").filter(f => f.endsWith(".sql"))
  .map(f => readFileSync(`drizzle/migrations/${f}`, "utf8")).join("\n");

describe("official document registry", () => {
  it("finalizePdf applies the official marks (reference + QR) for every report", () => {
    expect(core).toMatch(/applyOfficialMarks\(doc, fontFamily, filename/);
  });
  it("registry table is read-only for clients and verification exposes no personal data", () => {
    expect(migrations).toContain("CREATE TABLE public.issued_documents");
    expect(migrations).not.toMatch(/ON public\.issued_documents FOR (INSERT|UPDATE|DELETE)/);
    const returns = migrations.match(/verify_issued_document\(p_code text\)\s*RETURNS TABLE\(([^)]*)\)/g) ?? [];
    expect(returns.length).toBeGreaterThan(0);
    for (const r of returns) expect(r).not.toMatch(/issued_by|source_id|recipient|hash/);
  });
  it("disbursement voucher is registered and carries a verification QR", () => {
    expect(voucherIndex).toMatch(/rpc\("issue_document"/);
    expect(renderer).toMatch(/addImage\(qr/);
  });
  it("public verification page is routed", () => {
    expect(routes).toContain('/verify/document/:code');
    expect(verifyDocumentUrl("https://waqf-wise.net", "abc")).toBe("https://waqf-wise.net/verify/document/abc");
  });
  it("derives a valid doc type from Arabic or Latin filenames", () => {
    expect(docTypeFromFilename("annual-disclosure-2024-2025.pdf")).toBe("annual_disclosure");
    expect(docTypeFromFilename("التقرير_السنوي.pdf")).toBe("report");
  });
});
