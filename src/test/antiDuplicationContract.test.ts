/**
 * عقد عدم التكرار (Anti-Duplication Contract)
 * يحرس القواعد المعتمدة: أي منطق/تخطيط/نوع مشترك يجب أن يأتي من وحدة واحدة.
 * البوابة الكمية الكاملة في: npm run quality:dup (jscpd).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("قواعد عدم التكرار", () => {
  it("بوابة التكرار مسجّلة في package.json و.jscpd.json موجود", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["quality:dup"]).toBeTruthy();
    expect(existsSync(join(ROOT, ".jscpd.json"))).toBe(true);
    expect(existsSync(join(ROOT, "scripts/duplication-gate.mjs"))).toBe(true);
  });

  it("عروض العقود تستهلك ContractItem و STATUS_MAP من الوحدة المشتركة فقط", () => {
    const dir = join(ROOT, "src/components/contracts");
    const views = readdirSync(dir).filter((f) => /^ContractsView.*\.tsx$/.test(f));
    expect(views.length).toBeGreaterThanOrEqual(3);
    for (const file of views) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src, `${file}: يعيد تعريف ContractItem`).not.toMatch(/interface ContractItem\b/);
      expect(src, `${file}: يعيد تعريف STATUS_MAP`).not.toMatch(/const STATUS_MAP\b/);
      expect(src).toContain("./contractsViewShared");
    }
  });

  it("عروض عقود الحسابات تستهلك Props من نوع مشترك واحد", () => {
    for (const file of ["AccountsContractsDesktopTable.tsx", "AccountsContractsMobileList.tsx"]) {
      const src = read(`src/components/accounts/contracts/${file}`);
      expect(src, `${file}: Props محلية مكرّرة`).not.toMatch(/interface Props \{/);
      expect(src).toContain("AccountsContractsViewProps");
    }
  });

  it("منطق معاينة/تنزيل وثائق الأرشيف موجود في هوك مشترك واحد", () => {
    const shared = read("src/hooks/application/archive/useArchiveDocumentViewer.ts");
    expect(shared).toContain("handlePreview");
    expect(shared).toContain("handleDownload");
    for (const page of [
      "src/hooks/page/admin/management/useArchivePage.ts",
      "src/hooks/page/beneficiary/views/useArchiveViewPage.ts",
    ]) {
      const src = read(page);
      expect(src).toContain("useArchiveDocumentViewer");
      expect(src, `${page}: يعيد تنفيذ منطق المعاينة`).not.toMatch(/const handlePreview = async/);
      expect(src, `${page}: يعيد تنفيذ منطق التنزيل`).not.toMatch(/const handleDownload = async/);
    }
  });

  it("الصفحات القانونية تستخدم قشرة موحّدة بدل تكرار التخطيط", () => {
    for (const page of ["src/pages/PrivacyPolicy.tsx", "src/pages/TermsOfUse.tsx"]) {
      const src = read(page);
      expect(src).toContain("LegalPageShell");
      expect(src, `${page}: تخطيط الهيدر مكرّر`).not.toContain("gradient-primary py-16");
    }
  });

  it("أنواع مدخلات حسابات العقارات معرّفة مرة واحدة", () => {
    const perf = read("src/hooks/domain/financial/usePropertyPerformance.ts");
    expect(perf).toContain("PropertyContractInput");
    expect(perf).not.toMatch(/interface (Contract|Expense|Unit) \{/);
  });
});
