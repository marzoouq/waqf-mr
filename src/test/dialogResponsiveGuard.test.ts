/**
 * حارس انحدار: ملاءمة مربعات الحوار لكل الشاشات (جوال/لوحي/مكتب).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read = (p: string): string => readFileSync(join(process.cwd(), p), "utf8");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });

// ملفات يُسمح فيها بعمودين ثابتين (عرض أرقام مختصرة وليس حقول إدخال)
const GRID_ALLOWLIST = ["DistributeDialog.tsx"];

const dialogFiles = walk(join(process.cwd(), "src")).filter((f) => {
  if (f.includes(join("components", "ui"))) return false;
  return /(DialogContent|AlertDialogContent)/.test(readFileSync(f, "utf8"));
});

describe("dialogResponsiveGuard", () => {
  it("إطار مربع الحوار: هامش جوال + dvh + تمرير", () => {
    const src = read("src/components/ui/dialog.tsx");
    expect(src).toContain("w-[calc(100%-2rem)]");
    expect(src).toContain("max-h-[90dvh]");
    expect(src).toContain("overflow-y-auto");
    expect(src).not.toMatch(/max-h-\[\d+vh\]/);
  });

  it("مربع التأكيد: هامش جوال + dvh + تمرير + اتجاه عربي", () => {
    const src = read("src/components/ui/alert-dialog.tsx");
    expect(src).toContain("w-[calc(100%-2rem)]");
    expect(src).toContain("max-h-[90dvh]");
    expect(src).toContain("overflow-y-auto");
    expect(src).not.toContain("sm:text-left");
    expect(src).not.toContain("sm:space-x-2");
  });

  it("القائمة المنبثقة لا تتجاوز عرض الشاشة", () => {
    expect(read("src/components/ui/popover.tsx")).toContain("max-w-[calc(100vw-2rem)]");
  });

  it("لا نماذج بعمودين ثابتين داخل مربعات الحوار", () => {
    const offenders = dialogFiles
      .filter((f) => !GRID_ALLOWLIST.some((a) => f.endsWith(a)))
      .flatMap((f) =>
        readFileSync(f, "utf8")
          .split("\n")
          .map((line, i) => ({ line, i }))
          .filter(({ line }) => /(^|["\s])grid-cols-[234](\s|")/.test(line) && !/TabsList/.test(line))
          .map(({ i }) => `${f}:${i + 1}`),
      );
    expect(offenders).toEqual([]);
  });

  it("لا ارتفاع بـ vh ولا max-h بلا تمرير على DialogContent", () => {
    const offenders = dialogFiles.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => /DialogContent[^>]*className="/.test(line))
        .filter(({ line }) => /\b(max-)?h-\[\d+vh\]/.test(line) || (/max-h-/.test(line) && !/overflow-/.test(line)))
        .map(({ i }) => `${f}:${i + 1}`),
    );
    expect(offenders).toEqual([]);
  });
});
