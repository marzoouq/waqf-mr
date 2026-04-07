// ═══════════════════════════════════════════════════════════════════════════════
// dashboard-summary v3: RPC مُجمّعة + استعلام سلف فقط — heatmap/recent_contracts نُقلت للعميل
// ═══════════════════════════════════════════════════════════════════════════════

// @ts-expect-error Deno npm specifier is resolved at runtime in Supabase Edge.
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-expect-error Deno npm specifier is resolved at runtime in Supabase Edge.
import { z } from "npm:zod@3";
import { getCorsHeaders } from "../_shared/cors.ts";

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const RequestSchema = z.object({
  fiscal_year_id: z.string().min(1),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" };
  

  try {
    // ── المصادقة ──
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const supaAuth = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ── المرحلة 1: المصادقة + قراءة body بالتوازي ──
    const [authResult, body] = await Promise.all([
      supaAuth.auth.getUser(),
      req.json().catch(() => null),
    ]);

    const { data: { user }, error: userError } = authResult;
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    // ── التحقق من المدخلات (لا يحتاج شبكة — فوري) ──
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


    // ── المرحلة 2: roles + rateLimit + RPC + pending_advances بالتوازي ──
    const [rolesRes, rateLimitRes, rpcRes, pendingRes] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "accountant"]),
      admin.rpc("check_rate_limit", { p_key: `dashboard-summary:${user.id}`, p_limit: 30, p_window_seconds: 60 }),
      admin.rpc("get_dashboard_full_summary", { p_fiscal_year_id: rpcParam }),
      admin.from("advance_requests")
        .select("id, beneficiary_id, fiscal_year_id, amount, status, reason, created_at, approved_at, paid_at, rejection_reason, beneficiary:beneficiaries(id, name, share_percentage, user_id), fiscal_year:fiscal_years(label)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // التحقق من النتائج بالترتيب
    if (!rolesRes.data?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
    }

    if (rateLimitRes.data) {
      return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح من الطلبات" }), { status: 429, headers: jsonHeaders });
    }


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
    const msg = e instanceof Error ? e.message : "خطأ غير متوقع";
    console.error("dashboard-summary error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
