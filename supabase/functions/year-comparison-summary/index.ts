// ═══════════════════════════════════════════════════════════════════════════════
// year-comparison-summary — وكيل Edge لـ RPC public.get_year_comparison_summary
// السبب: الدالة محصورة على service_role لمنع التسريب المباشر من العميل.
// الدور المسموح: admin, accountant فقط.
// ═══════════════════════════════════════════════════════════════════════════════

// @ts-expect-error Deno npm specifier is resolved at runtime in Supabase Edge.
import { z } from "npm:zod@3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const RequestSchema = z.object({
  year1_id: z.string().uuid(),
  year2_id: z.string().uuid(),
}).refine((d) => d.year1_id !== d.year2_id, { message: "يجب اختيار سنتين مختلفتين" });

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" };

  try {
    const auth = await authenticate(req, corsHeaders, {
      allowedRoles: ["admin", "accountant"],
      rateLimitKey: "year-comparison-summary",
      parseJsonBody: true,
    });
    if ("error" in auth) return auth.error;
    const { admin, body } = auth as typeof auth & { body: unknown };

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "بيانات غير صالحة", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const { year1_id, year2_id } = parsed.data;
    const { data, error } = await admin.rpc("get_year_comparison_summary", {
      p_year1_id: year1_id,
      p_year2_id: year2_id,
    });
    if (error) {
      console.error("year-comparison-summary RPC error");
      return new Response(JSON.stringify({ error: "خطأ في استعلام البيانات" }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify(data ?? null), { headers: jsonHeaders });
  } catch (e) {
    console.error("year-comparison-summary error:", e instanceof Error ? e.message : e);
    return new Response(
      JSON.stringify({ error: "خطأ داخلي في الخادم، يرجى المحاولة لاحقاً" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
