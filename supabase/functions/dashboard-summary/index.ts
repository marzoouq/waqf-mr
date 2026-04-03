// ═══════════════════════════════════════════════════════════════════════════════
// dashboard-summary: دمج جميع استعلامات لوحة التحكم في طلب واحد
// يقلل ~10 طلبات شبكة من العميل إلى طلب واحد
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

type FiscalYearRow = {
  id: string;
  label: string;
  start_date: string;
};

type AmountRow = { amount: number | null };

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

    // ── تشغيل المصادقة + body + الدور + rate limit + السنوات المالية بالتوازي ──
    const [authResult, body, fiscalYearsEarlyRes] = await Promise.all([
      supaAuth.auth.getUser(),
      req.json().catch(() => null),
      admin.from("fiscal_years")
        .select("id, label, start_date, end_date, status, published, created_at")
        .order("start_date", { ascending: false })
        .limit(50),
    ]);

    const {
      data: { user },
      error: userError,
    } = authResult;

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const t1 = performance.now();
    console.log(`[timing] auth+body+FY: ${(t1 - t0).toFixed(0)}ms`);

    // التحقق من الدور + rate limit (يعتمد على user.id)
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

    const allFiscalYears = (fiscalYearsEarlyRes.data || []) as FiscalYearRow[];

    // تحديد السنة السابقة لمقارنة YoY
    let prevYearId: string | null = null;
    let prevYearLabel = "";
    if (!isAll && fiscal_year_id) {
      const sorted = [...allFiscalYears].sort((a, b) => a.start_date.localeCompare(b.start_date));
      const idx = sorted.findIndex((fy) => fy.id === fiscal_year_id);
      if (idx > 0) {
        prevYearId = sorted[idx - 1].id;
        prevYearLabel = sorted[idx - 1].label;
      }
    }

    // ── الخطوة الرئيسية: جلب كل البيانات + YoY في نفس Promise.all ──
    const mainQueries = [
      // 1. العقارات
      admin.from("properties")
        .select("id, property_number, property_type, location, area, vat_exempt, description, created_at, updated_at")
        .order("created_at", { ascending: false }),

      // 2. العقود
      (() => {
        let q = admin.from("contracts")
          .select("id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, created_at, property:properties(id, property_number), unit:units(id, unit_number, status)")
          .order("start_date", { ascending: false });
        if (!isAll) q = q.eq("fiscal_year_id", fiscal_year_id);
        else q = q.limit(1000);
        return q;
      })(),

      // 3. الوحدات
      admin.from("units")
        .select("id, property_id, unit_number, unit_type, floor, area, status, notes, created_at, updated_at")
        .order("unit_number")
        .limit(1000),

      // 4. فواتير الدفعات
      (() => {
        let q = admin.from("payment_invoices")
          .select("id, contract_id, fiscal_year_id, invoice_number, payment_number, due_date, amount, status, paid_date, paid_amount, invoice_type, icv, invoice_hash, created_at, contract:contracts(contract_number, tenant_name, property_id, payment_count, property:properties(property_number))")
          .order("due_date", { ascending: true });
        if (!isAll) q = q.eq("fiscal_year_id", fiscal_year_id);
        return q.limit(1000);
      })(),

      // 5. تخصيصات العقود
      (() => {
        let q = admin.from("contract_fiscal_allocations")
          .select("id, contract_id, fiscal_year_id, period_start, period_end, allocated_payments, allocated_amount, created_at")
          .limit(500);
        if (!isAll && fiscal_year_id) q = q.eq("fiscal_year_id", fiscal_year_id);
        return q;
      })(),

      // 6. طلبات السلف
      (() => {
        let q = admin.from("advance_requests")
          .select("id, beneficiary_id, fiscal_year_id, amount, status, reason, created_at, approved_at, paid_at, rejection_reason, beneficiary:beneficiaries(id, name, share_percentage, user_id), fiscal_year:fiscal_years(label)")
          .order("created_at", { ascending: false })
          .limit(100);
        if (!isAll && fiscal_year_id) q = q.eq("fiscal_year_id", fiscal_year_id);
        return q;
      })(),

      // 7. العقود بدون سنة مالية
      admin.from("contracts")
        .select("id, contract_number")
        .is("fiscal_year_id", null)
        .limit(500),

      // 8. الإيرادات
      (() => {
        let q = admin.from("income")
          .select("id, amount, date, source, notes, fiscal_year_id, property_id, contract_id, created_at, property:properties(id, property_number, location)")
          .order("date", { ascending: false });
        if (!isAll) q = q.eq("fiscal_year_id", fiscal_year_id).limit(2000);
        else q = q.limit(2000);
        return q;
      })(),

      // 9. المصروفات
      (() => {
        let q = admin.from("expenses")
          .select("id, amount, date, description, expense_type, fiscal_year_id, property_id, created_at, property:properties(id, property_number, location)")
          .order("date", { ascending: false });
        if (!isAll) q = q.eq("fiscal_year_id", fiscal_year_id).limit(2000);
        else q = q.limit(1000);
        return q;
      })(),

      // 10. الحسابات الختامية
      (() => {
        let q = admin.from("accounts")
          .select("id, fiscal_year, fiscal_year_id, total_income, total_expenses, net_after_expenses, vat_amount, net_after_vat, zakat_amount, admin_share, waqif_share, waqf_revenue, waqf_corpus_manual, waqf_corpus_previous, distributions_amount, created_at, updated_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (!isAll && fiscal_year_id) q = q.eq("fiscal_year_id", fiscal_year_id);
        return q;
      })(),

      // 11. المستفيدون (عرض آمن)
      admin.from("beneficiaries_safe")
        .select("id, name, share_percentage, user_id, email, phone, national_id, bank_account, notes, created_at, updated_at")
        .order("name")
        .limit(500),

      // 12. إعدادات التطبيق
      admin.from("app_settings").select("key, value"),

      // 13 & 14. YoY للسنة السابقة (فقط عند توفرها)
      ...(prevYearId
        ? [
            admin.from("income").select("amount").eq("fiscal_year_id", prevYearId),
            admin.from("expenses").select("amount").eq("fiscal_year_id", prevYearId),
          ]
        : []),
    ];

    const results = await Promise.all(mainQueries);

    const [
      propertiesRes,
      contractsRes,
      unitsRes,
      paymentInvoicesRes,
      allocationsRes,
      advanceRequestsRes,
      orphanedRes,
      incomeRes,
      expensesRes,
      accountsRes,
      beneficiariesRes,
      settingsRes,
    ] = results;

    const t3 = performance.now();
    console.log(`[timing] main Promise.all (+YoY): ${(t3 - t2).toFixed(0)}ms`);

    let prevYear: { fiscal_year_id: string; label: string; total_income: number; total_expenses: number } | null = null;
    if (prevYearId) {
      const prevIncomeData = ((results[12] as { data?: AmountRow[] } | undefined)?.data || []) as AmountRow[];
      const prevExpensesData = ((results[13] as { data?: AmountRow[] } | undefined)?.data || []) as AmountRow[];
      const totalIncome = prevIncomeData.reduce((s, r) => s + (r.amount || 0), 0);
      const totalExpenses = prevExpensesData.reduce((s, r) => s + (r.amount || 0), 0);
      prevYear = {
        fiscal_year_id: prevYearId,
        label: prevYearLabel,
        total_income: totalIncome,
        total_expenses: totalExpenses,
      };
    }

    // ── تجميع الإعدادات ──
    const settings: Record<string, string> = {};
    (settingsRes.data || []).forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value;
    });

    // ── حسابات مُجمّعة على الخادم لتخفيف عبء العميل ──
    const incomeArr = (incomeRes.data || []) as Array<{ amount?: number | null; date?: string | null }>;
    const expensesArr = (expensesRes.data || []) as Array<{ amount?: number | null; date?: string | null; expense_type?: string | null }>;
    const contractsArr = (contractsRes.data || []) as Array<{ id?: string; status?: string; rent_amount?: number | null }>;
    const piArr = (paymentInvoicesRes.data || []) as Array<{ contract_id?: string; status?: string; due_date?: string; amount?: number | null; paid_amount?: number | null }>;

    // إجمالي الدخل والمصروفات
    const computedTotalIncome = incomeArr.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const computedTotalExpenses = expensesArr.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    // بيانات شهرية
    const monthMap: Record<string, { income: number; expenses: number }> = {};
    for (const item of incomeArr) {
      const m = item.date?.substring(0, 7);
      if (m) { if (!monthMap[m]) monthMap[m] = { income: 0, expenses: 0 }; monthMap[m].income += Number(item.amount) || 0; }
    }
    for (const item of expensesArr) {
      const m = item.date?.substring(0, 7);
      if (m) { if (!monthMap[m]) monthMap[m] = { income: 0, expenses: 0 }; monthMap[m].expenses += Number(item.amount) || 0; }
    }
    const computedMonthlyData = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, income: data.income, expenses: data.expenses }));

    // أنواع المصروفات
    const expTypeMap: Record<string, number> = {};
    for (const e of expensesArr) {
      const t = e.expense_type || "أخرى";
      expTypeMap[t] = (expTypeMap[t] || 0) + (Number(e.amount) || 0);
    }
    const computedExpenseTypes = Object.entries(expTypeMap).map(([name, value]) => ({ name, value }));

    // ملخص التحصيل
    const activeContractIds = new Set(
      contractsArr.filter(c => c.status === "active" || c.status === "expired").map(c => c.id)
    );
    const nowDate = new Date();
    const dueInvoices = piArr.filter(
      inv => activeContractIds.has(inv.contract_id) && new Date(inv.due_date ?? "") <= nowDate
    );
    const collTotalExpected = dueInvoices.reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
    const collTotalCollected = dueInvoices.reduce((s, inv) => {
      if (inv.status === "paid") return s + (Number(inv.amount) || 0);
      if (inv.status === "partially_paid") return s + (Number(inv.paid_amount) || 0);
      return s;
    }, 0);
    const computedCollection = {
      paidCount: dueInvoices.filter(i => i.status === "paid").length,
      partialCount: dueInvoices.filter(i => i.status === "partially_paid").length,
      unpaidCount: dueInvoices.length - dueInvoices.filter(i => i.status === "paid").length - dueInvoices.filter(i => i.status === "partially_paid").length,
      total: dueInvoices.length,
      percentage: collTotalExpected > 0 ? Math.round((collTotalCollected / collTotalExpected) * 100) : 0,
      totalCollected: collTotalCollected,
      totalExpected: collTotalExpected,
    };

    // ── بناء الاستجابة ──
    const result = {
      properties: propertiesRes.data || [],
      contracts: contractsRes.data || [],
      units: unitsRes.data || [],
      payment_invoices: paymentInvoicesRes.data || [],
      contract_allocations: allocationsRes.data || [],
      advance_requests: advanceRequestsRes.data || [],
      orphaned_contracts: orphanedRes.data || [],
      income: incomeRes.data || [],
      expenses: expensesRes.data || [],
      accounts: accountsRes.data || [],
      beneficiaries: beneficiariesRes.data || [],
      settings,
      fiscal_years: allFiscalYears,
      prev_year: prevYear,
      // حقول مُحسوبة مسبقاً
      computed: {
        totalIncome: computedTotalIncome,
        totalExpenses: computedTotalExpenses,
        monthlyData: computedMonthlyData,
        expenseTypes: computedExpenseTypes,
        collection: computedCollection,
      },
      fetched_at: new Date().toISOString(),
    };

    const tEnd = performance.now();
    console.log(`[timing] total: ${(tEnd - t0).toFixed(0)}ms | response size: ${JSON.stringify(result).length} bytes`);

    return new Response(JSON.stringify(result), { headers: jsonHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ غير متوقع";
    console.error("dashboard-summary error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
