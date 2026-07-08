// ═══════════════════════════════════════════════════════════════════════════════
// beneficiary-summary: دمج بيانات المستفيد (حصته، توزيعاته، سُلفه، ترحيلاته)
// في طلب واحد بدل عدة طلبات منفصلة من العميل
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "npm:zod@3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RequestSchema = z.object({
  fiscal_year_id: z.string().regex(UUID_RE, "UUID غير صالح").optional(),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" };

  try {
    // ── المصادقة + الدور + rate limit + body بالتوازي ──
    const auth = await authenticate(req, corsHeaders, {
      allowedRoles: ["beneficiary", "admin", "accountant"],
      rateLimitKey: "beneficiary-summary",
      parseJsonBody: true,
    });
    if ("error" in auth) return auth.error;
    const { user, admin, body } = auth as typeof auth & { body: unknown };

    // ── التحقق من المدخلات ──
    const parsed = RequestSchema.safeParse(body ?? {});
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

    // تحديد الدور: المستفيد يرى السنوات المنشورة فقط (يحترم RESTRICTIVE RLS).
    // admin/accountant يرون كل السنوات كالمعتاد.
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "accountant"]);
    const isPrivileged = !!roleRows?.length;

    let publishedFyIds: string[] | null = null;
    if (!isPrivileged) {
      const { data: fyRows, error: fyErr } = await admin
        .from("fiscal_years")
        .select("id")
        .eq("published", true);
      if (fyErr) throw fyErr;
      publishedFyIds = (fyRows ?? []).map((r: { id: string }) => r.id);
      // إذا لا توجد سنوات منشورة، لا شيء يجب عرضه.
      if (publishedFyIds.length === 0) publishedFyIds = ["00000000-0000-0000-0000-000000000000"];
      // إذا طُلبت سنة معيّنة غير منشورة، ارفض
      if (fiscal_year_id && !publishedFyIds.includes(fiscal_year_id)) {
        return new Response(
          JSON.stringify({ error: "السنة المالية المطلوبة غير متاحة" }),
          { status: 403, headers: jsonHeaders },
        );
      }
    }

    // بناء استعلام التوزيعات
    let distQuery = admin
      .from("distributions")
      .select("id, beneficiary_id, account_id, amount, date, fiscal_year_id, status, account:accounts(id, fiscal_year, fiscal_year_id)")
      .eq("beneficiary_id", beneficiaryId)
      .order("date", { ascending: false })
      .limit(200);

    if (fiscal_year_id) {
      distQuery = distQuery.eq("fiscal_year_id", fiscal_year_id);
    } else if (publishedFyIds) {
      distQuery = distQuery.in("fiscal_year_id", publishedFyIds);
    }

    let advQuery = admin
      .from("advance_requests")
      .select("id, beneficiary_id, fiscal_year_id, amount, reason, status, rejection_reason, approved_by, approved_at, paid_at, created_at")
      .eq("beneficiary_id", beneficiaryId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (publishedFyIds) advQuery = advQuery.in("fiscal_year_id", publishedFyIds);

    // للترحيلات: نفلتر بحسب to_fiscal_year_id (السنة الهدف) لتفادي كشف مبالغ سنوات غير منشورة
    let cfQuery = admin
      .from("advance_carryforward")
      .select("id, beneficiary_id, from_fiscal_year_id, to_fiscal_year_id, amount, status, notes, created_at")
      .eq("beneficiary_id", beneficiaryId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (publishedFyIds) cfQuery = cfQuery.in("to_fiscal_year_id", publishedFyIds);

    const [advRes, cfRes, distRes, pctRes] = await Promise.all([
      advQuery,
      cfQuery,
      distQuery,
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
    // سجّل التفاصيل الكاملة في السيرفر فقط — لا تكشفها للعميل
    console.error("beneficiary-summary error:", err instanceof Error ? err.message : err);
    return new Response(
      JSON.stringify({ error: "خطأ داخلي في الخادم، يرجى المحاولة لاحقاً" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
