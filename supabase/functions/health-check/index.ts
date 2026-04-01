import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Health Check Edge Function
 * يتحقق من حالة الوظائف وقاعدة البيانات — لا يتطلب مصادقة
 * يُرجع حالة مبسّطة فقط دون كشف تفاصيل داخلية
 */
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let allOk = true;

  // فحص اتصال قاعدة البيانات
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase
      .from("fiscal_years")
      .select("id")
      .limit(1);
    if (error) allOk = false;
  } catch {
    allOk = false;
  }

  // فحص متغيرات البيئة الأساسية
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  if (requiredEnvVars.some((v) => !Deno.env.get(v))) {
    allOk = false;
  }

  // استجابة مبسّطة — لا تكشف أي تفاصيل داخلية
  return new Response(
    JSON.stringify({
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
    }),
    {
      status: allOk ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
