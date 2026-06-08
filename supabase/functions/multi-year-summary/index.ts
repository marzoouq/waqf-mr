// ═══════════════════════════════════════════════════════════════════════════════
// multi-year-summary — وكيل Edge لـ RPC public.get_multi_year_summary
// السبب: الدالة محصورة على service_role لمنع التسريب المباشر من العميل.
// الدور المسموح: admin, accountant فقط (الواقف/المستفيد لا يستخدمان هذا التقرير).
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
  year_ids: z.array(z.string().uuid()).min(1).max(20),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" };

  try {
    const auth = await authenticate(req, corsHeaders, {
      allowedRoles: ["admin", "accountant"],
      rateLimitKey: "multi-year-summary",
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

    const { year_ids } = parsed.data;
    const { data, error } = await admin.rpc("get_multi_year_summary", { p_year_ids: year_ids });
    if (error) {
      console.error("multi-year-summary RPC error");
      return new Response(JSON.stringify({ error: "خطأ في استعلام البيانات" }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify(data ?? []), { headers: jsonHeaders });
  } catch (e) {
    console.error("multi-year-summary error:", e instanceof Error ? e.message : e);
    return new Response(
      JSON.stringify({ error: "خطأ داخلي في الخادم، يرجى المحاولة لاحقاً" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
