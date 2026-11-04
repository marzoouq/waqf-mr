import { describe, expect, it } from "vitest";
import { backendEnvFallbackDefines, PUBLIC_BACKEND_ENV } from "../../scripts/public-backend-env";

// حارس انحدار: الموقع الحي توقف على شاشة التحميل لأن بناء النشر لم يجد `.env`.
describe("public backend env fallback", () => {
  it("injects URL and publishable key when .env is missing", () => {
    const defines = backendEnvFallbackDefines({});
    expect(defines["import.meta.env.VITE_SUPABASE_URL"]).toBe(
      JSON.stringify(PUBLIC_BACKEND_ENV.VITE_SUPABASE_URL),
    );
    expect(defines["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"]).toBe(
      JSON.stringify(PUBLIC_BACKEND_ENV.VITE_SUPABASE_PUBLISHABLE_KEY),
    );
  });

  it("treats blank values as missing", () => {
    const defines = backendEnvFallbackDefines({ VITE_SUPABASE_URL: "  " });
    expect(defines["import.meta.env.VITE_SUPABASE_URL"]).toBeDefined();
  });

  it("never overrides values that .env provides", () => {
    const defines = backendEnvFallbackDefines({
      VITE_SUPABASE_URL: "https://x.example",
      VITE_SUPABASE_PUBLISHABLE_KEY: "k",
      VITE_SUPABASE_PROJECT_ID: "p",
    });
    expect(defines).toEqual({});
  });

  it("only ships the public anon key, never a service role key", () => {
    const segment = PUBLIC_BACKEND_ENV.VITE_SUPABASE_PUBLISHABLE_KEY.split(".")[1] ?? "";
    const payload = JSON.parse(Buffer.from(segment, "base64").toString()) as {
      role: string;
      ref: string;
    };
    expect(payload.role).toBe("anon");
    expect(PUBLIC_BACKEND_ENV.VITE_SUPABASE_URL).toContain(payload.ref);
  });
});
