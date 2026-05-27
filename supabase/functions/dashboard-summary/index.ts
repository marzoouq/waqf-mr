// ═══════════════════════════════════════════════════════════════════════════════
// dashboard-summary v3: RPC مُجمّعة + استعلام سلف فقط — heatmap/recent_contracts نُقلت للعميل
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
  fiscal_year_id: z.string().min(1),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" };

  try {
    // ── المصادقة (getUser شبكي للتحقق من توقيع JWT) + body + role + rateLimit ──
    // ملاحظة أمنية: لا نستخدم useClaims هنا لأن verify_jwt = false، فالتحقق المحلي
    // من الادعاءات لا يتحقق من التوقيع ويسمح بتزوير JWT بمعرف admin معروف.
    const auth = await authenticate(req, corsHeaders, {
      allowedRoles: ["admin", "accountant"],
      rateLimitKey: "dashboard-summary",
      parseJsonBody: true,
    });
    if ("error" in auth) return auth.error;
    const { admin, body } = auth as typeof auth & { body: unknown };

    // ── التحقق من المدخلات ──
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "بيانات غير صالحة", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const { fiscal_year_id } = parsed.data;
    const isAll = fiscal_year_id === "all";
    const rpcParam = isAll ? null : fiscal_year_id;

    // ── جلب RPC + pending_advances بالتوازي ──
    const [rpcRes, pendingRes] = await Promise.all([
      admin.rpc("get_dashboard_full_summary", { p_fiscal_year_id: rpcParam }),
      admin.from("advance_requests")
        .select("id, beneficiary_id, fiscal_year_id, amount, status, reason, created_at, approved_at, paid_at, rejection_reason, beneficiary:beneficiaries(id, name, share_percentage, user_id), fiscal_year:fiscal_years(label)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (rpcRes.error) {
      console.error("RPC error");
      return new Response(JSON.stringify({ error: "خطأ في استعلام البيانات" }), { status: 500, headers: jsonHeaders });
    }

    // ── بناء الاستجابة (بدون heatmap_invoices و recent_contracts) ──
    const result = {
      aggregated: rpcRes.data,
      pending_advances: pendingRes.data || [],
      fetched_at: new Date().toISOString(),
    };

    const responseStr = JSON.stringify(result);

    return new Response(responseStr, { headers: jsonHeaders });
  } catch (e) {
    // سجّل التفاصيل في السيرفر، أعد رسالة عامة للعميل
    console.error("dashboard-summary error:", e instanceof Error ? e.message : e);
    return new Response(
      JSON.stringify({ error: "خطأ داخلي في الخادم، يرجى المحاولة لاحقاً" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
