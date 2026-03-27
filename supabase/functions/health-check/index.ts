import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Health Check Edge Function
 * يتحقق من حالة الوظائف وقاعدة البيانات — لا يتطلب مصادقة
 */
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {};

  // 1. فحص اتصال قاعدة البيانات
  const dbStart = performance.now();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase
      .from("fiscal_years")
      .select("id")
      .limit(1);
    checks.database = {
      ok: !error,
      ms: Math.round(performance.now() - dbStart),
      ...(error ? { error: error.message } : {}),
    };
  } catch (e) {
    checks.database = {
      ok: false,
      ms: Math.round(performance.now() - dbStart),
      error: e instanceof Error ? e.message : "خطأ غير معروف",
    };
  }

  // 2. فحص متغيرات البيئة الأساسية
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missingVars = requiredEnvVars.filter((v) => !Deno.env.get(v));
  checks.environment = {
    ok: missingVars.length === 0,
    ...(missingVars.length > 0 ? { error: `متغيرات مفقودة: ${missingVars.length}` } : {}),
  };

  // 3. النتيجة الإجمالية
  const allOk = Object.values(checks).every((c) => c.ok);

  return new Response(
    JSON.stringify({
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    }),
    {
      status: allOk ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
