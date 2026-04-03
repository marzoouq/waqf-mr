// ═══════════════════════════════════════════════════════════════════════════════
// dashboard-summary v2: RPC مُجمّعة + 3 استعلامات خفيفة بدلاً من 14 استعلاماً
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
  const t0 = performance.now();

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

    // ── تشغيل المصادقة + body بالتوازي ──
    const [authResult, body] = await Promise.all([
      supaAuth.auth.getUser(),
      req.json().catch(() => null),
    ]);

    const { data: { user }, error: userError } = authResult;
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const t1 = performance.now();
    console.log(`[timing] auth+body: ${(t1 - t0).toFixed(0)}ms`);

    // التحقق من الدور + rate limit
    const [rolesRes, rateLimitRes] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "accountant"]),
      admin.rpc("check_rate_limit", { p_key: `dashboard-summary:${user.id}`, p_limit: 30, p_window_seconds: 60 }),
    ]);

    if (!rolesRes.data?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
    }

    if (rateLimitRes.data) {
      return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح من الطلبات" }), { status: 429, headers: jsonHeaders });
    }

    const t2 = performance.now();
    console.log(`[timing] roles+rateLimit: ${(t2 - t1).toFixed(0)}ms`);

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

    // ── 4 استعلامات فقط بالتوازي ──
    const rpcParam = isAll ? null : fiscal_year_id;

    const [rpcRes, heatmapRes, pendingRes, recentRes] = await Promise.all([
      // 1. RPC المُجمّعة — كل الأرقام
      admin.rpc("get_dashboard_full_summary", { p_fiscal_year_id: rpcParam }),

      // 2. فواتير الدفعات للـ Heatmap + PendingActions (حقول محدودة)
      (() => {
        let q = admin.from("payment_invoices")
          .select("id, contract_id, invoice_number, payment_number, due_date, amount, status, paid_date, paid_amount, zatca_status, fiscal_year_id, contract:contracts(contract_number, tenant_name, property_id, payment_count, property:properties(property_number))")
          .order("due_date", { ascending: true })
          .limit(500);
        if (!isAll) q = q.eq("fiscal_year_id", fiscal_year_id);
        return q;
      })(),

      // 3. طلبات السلف المعلقة
      admin.from("advance_requests")
        .select("id, beneficiary_id, fiscal_year_id, amount, status, reason, created_at, approved_at, paid_at, rejection_reason, beneficiary:beneficiaries(id, name, share_percentage, user_id), fiscal_year:fiscal_years(label)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),

      // 4. آخر 5 عقود
      admin.from("contracts")
        .select("id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, property:properties(id, property_number), unit:units(id, unit_number, status)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const t3 = performance.now();
    console.log(`[timing] RPC + 3 queries: ${(t3 - t2).toFixed(0)}ms`);

    if (rpcRes.error) {
      console.error("RPC error:", rpcRes.error);
      return new Response(JSON.stringify({ error: rpcRes.error.message }), { status: 500, headers: jsonHeaders });
    }

    // ── بناء الاستجابة ──
    const result = {
      aggregated: rpcRes.data,
      heatmap_invoices: heatmapRes.data || [],
      pending_advances: pendingRes.data || [],
      recent_contracts: recentRes.data || [],
      fetched_at: new Date().toISOString(),
    };

    const tEnd = performance.now();
    const responseStr = JSON.stringify(result);
    console.log(`[timing] total: ${(tEnd - t0).toFixed(0)}ms | response size: ${responseStr.length} bytes`);

    return new Response(responseStr, { headers: jsonHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ غير متوقع";
    console.error("dashboard-summary error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
