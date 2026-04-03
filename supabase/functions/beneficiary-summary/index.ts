// ═══════════════════════════════════════════════════════════════════════════════
// beneficiary-summary: دمج بيانات المستفيد (حصته، توزيعاته، سُلفه، ترحيلاته)
// في طلب واحد بدل عدة طلبات منفصلة من العميل
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RequestSchema = z.object({
  fiscal_year_id: z.string().regex(UUID_RE, "UUID غير صالح").optional(),
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

    // جلب المستخدم + تحليل الجسم بالتوازي
    const supaAuth = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const [authResult, body] = await Promise.all([
      supaAuth.auth.getUser(),
      req.json().catch(() => ({})),
    ]);
    const { data: { user }, error: userError } = authResult;
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // التحقق من الدور + Rate limiting بالتوازي
    const [rolesRes, rateLimitRes] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.rpc("check_rate_limit", { p_key: `beneficiary-summary:${user.id}`, p_limit: 30, p_window_seconds: 60 }),
    ]);

    const userRoles = (rolesRes.data ?? []).map((r: { role: string }) => r.role);
    const isBeneficiary = userRoles.includes("beneficiary");
    const isAdmin = userRoles.includes("admin");
    const isAccountant = userRoles.includes("accountant");

    if (!isBeneficiary && !isAdmin && !isAccountant) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
    }
    if (rateLimitRes.data) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد المسموح من الطلبات" }),
        { status: 429, headers: jsonHeaders },
      );
    }

    // ── التحقق من المدخلات ──
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "بيانات غير صالحة", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const { fiscal_year_id } = parsed.data;

    // ── جلب بيانات المستفيد ──
    const { data: beneficiary, error: benError } = await admin
      .from("beneficiaries")
      .select("id, name, share_percentage, user_id, phone, email, bank_account")
      .eq("user_id", user.id)
      .maybeSingle();

    if (benError) throw benError;

    if (!beneficiary) {
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على بيانات المستفيد" }),
        { status: 404, headers: jsonHeaders },
      );
    }

    // ── الاستعلامات المتوازية ──
    const beneficiaryId = beneficiary.id;

    // بناء استعلام التوزيعات
    let distQuery = admin
      .from("distributions")
      .select("id, beneficiary_id, account_id, amount, date, fiscal_year_id, status, account:accounts(id, fiscal_year, fiscal_year_id)")
      .eq("beneficiary_id", beneficiaryId)
      .order("date", { ascending: false })
      .limit(200);

    if (fiscal_year_id) {
      distQuery = distQuery.eq("fiscal_year_id", fiscal_year_id);
    }

    const [advRes, cfRes, distRes, pctRes] = await Promise.all([
      // السُلف
      admin
        .from("advance_requests")
        .select("id, beneficiary_id, fiscal_year_id, amount, reason, status, rejection_reason, approved_by, approved_at, paid_at, created_at")
        .eq("beneficiary_id", beneficiaryId)
        .order("created_at", { ascending: false })
        .limit(100),
      // الترحيلات
      admin
        .from("advance_carryforward")
        .select("id, beneficiary_id, from_fiscal_year_id, to_fiscal_year_id, amount, status, notes, created_at")
        .eq("beneficiary_id", beneficiaryId)
        .order("created_at", { ascending: false })
        .limit(100),
      // التوزيعات
      distQuery,
      // نسبة المستفيدين الإجمالية
      admin.rpc("get_total_beneficiary_percentage"),
    ]);

    if (advRes.error) throw advRes.error;
    if (cfRes.error) throw cfRes.error;
    if (distRes.error) throw distRes.error;

    const advances = advRes.data ?? [];
    const carryforwards = cfRes.data ?? [];
    const distributions = distRes.data ?? [];
    const totalBeneficiaryPercentage = typeof pctRes.data === "number" ? pctRes.data : 0;

    // ── حساب المشتقات ──
    const paidAdvancesTotal = advances
      .filter((a: { status: string; fiscal_year_id: string | null }) =>
        a.status === "paid" && (!fiscal_year_id || a.fiscal_year_id === fiscal_year_id),
      )
      .reduce((sum: number, a: { amount: number }) => sum + Number(a.amount || 0), 0);

    // #25: توحيد فلتر carryforward مع منطق الـ trigger — تراكمي بدون فلتر سنة
    const carryforwardBalance = carryforwards
      .filter((c: { status: string }) => c.status === "active")
      .reduce((sum: number, c: { amount: number }) => sum + Number(c.amount || 0), 0);

    const totalReceived = distributions
      .filter((d: { status: string }) => d.status === "paid")
      .reduce((sum: number, d: { amount: number }) => sum + Number(d.amount || 0), 0);

    const pendingAmount = distributions
      .filter((d: { status: string }) => d.status === "pending")
      .reduce((sum: number, d: { amount: number }) => sum + Number(d.amount || 0), 0);

    return new Response(
      JSON.stringify({
        beneficiary: {
          id: beneficiary.id,
          name: beneficiary.name,
          share_percentage: beneficiary.share_percentage,
          user_id: beneficiary.user_id,
        },
        advances,
        carryforwards,
        distributions,
        totalBeneficiaryPercentage,
        computed: {
          paidAdvancesTotal,
          carryforwardBalance,
          totalReceived,
          pendingAmount,
        },
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير متوقع";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
