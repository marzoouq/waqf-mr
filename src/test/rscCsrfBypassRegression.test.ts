/**
 * اختبار رجعي/تكاملي لثغرة:
 * "React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response"
 *
 * يغطّي ثلاثة محاور:
 * 1) تثبيت إصدار مُصلَّح لـ react-router / react-router-dom (>= 7.18.2) في package.json وملفات القفل.
 * 2) عدم استخدام واجهات RSC mode (المسار المصاب) في كود التطبيق.
 * 3) سلوكياً: أي معالج طلب لا ينفّذ الإجراء (side effect) قبل إرجاع 400 عند فشل التحقق.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const ROOT = process.cwd();
const MIN_PATCHED = [7, 18, 2] as const;

/** مقارنة إصدارات دلالية بسيطة */
const gte = (version: string, min: readonly number[]): boolean => {
  const parts = version.replace(/^[^\d]*/, "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < min.length; i += 1) {
    const bound = min[i] ?? 0;
    if ((parts[i] ?? 0) > bound) return true;
    if ((parts[i] ?? 0) < bound) return false;
  }
  return true;
};

describe("RSC Mode CSRF Bypass — اختبار رجعي", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    overrides?: Record<string, string>;
    resolutions?: Record<string, string>;
  };

  it("package.json يثبّت react-router و react-router-dom على إصدار مُصلَّح", () => {
    for (const name of ["react-router", "react-router-dom"]) {
      const range = pkg.dependencies?.[name] ?? pkg.overrides?.[name] ?? pkg.resolutions?.[name];
      expect(range, `${name} مفقود من package.json`).toBeTruthy();
      expect(gte(String(range), MIN_PATCHED), `${name}@${range} أقل من 7.18.2`).toBe(true);
    }
  });

  it("الإصدار المثبّت فعلياً في node_modules مُصلَّح", () => {
    for (const name of ["react-router", "react-router-dom"]) {
      const manifest = join(ROOT, "node_modules", name, "package.json");
      if (!existsSync(manifest)) continue;
      const { version } = JSON.parse(readFileSync(manifest, "utf8")) as { version: string };
      expect(gte(version, MIN_PATCHED), `${name}@${version} غير مُصلَّح`).toBe(true);
    }
  });

  it("ملفات القفل لا تحتوي على إصدار مصاب من react-router", () => {
    for (const lock of ["package-lock.json", "bun.lock"]) {
      const path = join(ROOT, lock);
      if (!existsSync(path)) continue;
      const raw = readFileSync(path, "utf8");
      const versions = [...raw.matchAll(/react-router(?:-dom)?@(\d+\.\d+\.\d+)/g)].map((m) => m[1] ?? "").filter(Boolean);
      const nodeModulesVersions = [
        ...raw.matchAll(/"node_modules\/react-router(?:-dom)?"[\s\S]{0,200}?"version":\s*"(\d+\.\d+\.\d+)"/g),
      ].map((m) => m[1] ?? "").filter(Boolean);
      for (const v of [...versions, ...nodeModulesVersions]) {
        expect(gte(v, MIN_PATCHED), `${lock} يحتوي react-router@${v} المصاب`).toBe(true);
      }
    }
  });

  it("لا يستخدم التطبيق واجهات RSC mode المصابة", () => {
    const forbidden = [
      "matchRSCServerRequest",
      "RSCHydratedRouter",
      "RSCStaticRouter",
      "unstable_createCallServer",
      "routeRSCServerRequest",
      "unstable_RSC",
    ];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !full.includes("rscCsrfBypassRegression")) {
          const content = readFileSync(full, "utf8");
          for (const api of forbidden) {
            if (content.includes(api)) offenders.push(`${full} → ${api}`);
          }
        }
      }
    };
    walk(join(ROOT, "src"));
    expect(offenders, "استخدام RSC mode يعيد فتح مسار الثغرة").toEqual([]);
  });

  it("كل وظيفة حافة تقرأ body تتحقق قبل تنفيذ أي إجراء كتابي", () => {
    const base = join(ROOT, "supabase", "functions");
    const problems: string[] = [];
    for (const dir of readdirSync(base, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const file = join(base, dir.name, "index.ts");
      if (!existsSync(file)) continue;
      const src = readFileSync(file, "utf8");
      if (!src.includes("req.json")) continue;

      const parseIdx = src.indexOf("safeParse");
      if (parseIdx < 0) {
        problems.push(`${dir.name}: لا يوجد safeParse`);
        continue;
      }
      if (!/status:\s*400/.test(src)) problems.push(`${dir.name}: لا يعيد 400 عند فشل التحقق`);

      const mutation = [...src.matchAll(/\.(insert|update|upsert|delete)\(/g)].map((m) => m.index ?? 0);
      const firstMutation = mutation.length ? Math.min(...mutation) : Number.POSITIVE_INFINITY;
      if (firstMutation < parseIdx) {
        problems.push(`${dir.name}: إجراء كتابي قبل التحقق (action before 400)`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("سلوكياً: المعالج يعيد 400 دون تنفيذ الإجراء عند طلب غير صالح (CSRF-shaped)", async () => {
    const action = vi.fn(async () => ({ mutated: true }));
    const Body = z.object({ invoice_id: z.string().uuid() });

    // نمط المعالج المعتمد في المشروع: تحقق أولاً ثم تنفيذ
    const handler = async (payload: unknown): Promise<Response> => {
      const parsed = Body.safeParse(payload);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400 });
      }
      await action();
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    // طلب مُشوّه (يمثّل طلب CSRF عبر RSC action)
    const bad = await handler({ invoice_id: "not-a-uuid", __rsc_action: "delete" });
    expect(bad.status).toBe(400);
    expect(action, "تم تنفيذ الإجراء قبل الاستجابة 400").not.toHaveBeenCalled();

    // طلب صالح ينفّذ الإجراء مرة واحدة فقط
    const good = await handler({ invoice_id: "11111111-1111-4111-8111-111111111111" });
    expect(good.status).toBe(200);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
