// ═══════════════════════════════════════════════════════════════════════════════
// dashboard-summary: دمج جميع استعلامات لوحة التحكم في طلب واحد
// يقلل ~10 طلبات شبكة من العميل إلى طلب واحد
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const RequestSchema = z.object({
  fiscal_year_id: z.string().min(1),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

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
      req.json().catch(() => null),
    ]);
    const { data: { user }, error: userError } = authResult;
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // التحقق من الدور + Rate limiting بالتوازي
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

    // ── التحقق من المدخلات ──
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "بيانات غير صالحة", details: parsed.error.flatten().fieldErrors }), { status: 400, headers: jsonHeaders });
    }
    const { fiscal_year_id } = parsed.data;
    const isAll = fiscal_year_id === "all";

    // ── الخطوة 1: جلب السنوات المالية (مطلوبة لتحديد السنة السابقة) ──
    const { data: fiscalYears } = await admin
      .from("fiscal_years")
      .select("id, label, start_date, end_date, status, published, created_at")
      .order("start_date", { ascending: false })
      .limit(50);
    const allFiscalYears = fiscalYears || [];

    // تحديد السنة السابقة لمقارنة YoY
    let prevFiscalYear: { id: string; label: string } | null = null;
    if (!isAll && fiscal_year_id) {
      const sorted = [...allFiscalYears].sort((a, b) => a.start_date.localeCompare(b.start_date));
      const idx = sorted.findIndex((fy) => fy.id === fiscal_year_id);
      if (idx > 0) prevFiscalYear = sorted[idx - 1];
    }

    // ── الخطوة 2: جلب كل البيانات بالتوازي ──
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
      prevIncomeRes,
      prevExpensesRes,
    ] = await Promise.all([
      // 1. العقارات
      admin.from("properties")
        .select("id, property_number, property_type, location, area, vat_exempt, description, created_at, updated_at")
        .order("created_at", { ascending: false }),

      // 2. العقود مع ربط العقار والوحدة
      (() => {
        let q = admin.from("contracts")
          .select("id, contract_number, tenant_name, property_id, unit_id, start_date, end_date, rent_amount, payment_type, payment_count, payment_amount, status, fiscal_year_id, notes, tenant_id_number, tenant_id_type, tenant_tax_number, tenant_crn, tenant_street, tenant_district, tenant_city, tenant_postal_code, tenant_building, created_at, updated_at, property:properties(id, property_number, property_type, location), unit:units(id, unit_number, unit_type, floor, status)")
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
          .select("id, contract_id, fiscal_year_id, invoice_number, payment_number, due_date, amount, status, paid_date, paid_amount, notes, vat_rate, vat_amount, zatca_uuid, zatca_status, file_path, created_at, updated_at, contract:contracts(contract_number, tenant_name, property_id, payment_count, property:properties(property_number))")
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
          .select("*, beneficiary:beneficiaries(id, name, share_percentage, user_id), fiscal_year:fiscal_years(label)")
          .order("created_at", { ascending: false })
          .limit(100);
        if (!isAll && fiscal_year_id) q = q.eq("fiscal_year_id", fiscal_year_id);
        return q;
      })(),

      // 7. العقود بدون سنة مالية (عدد فقط)
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

      // 13. إيرادات السنة السابقة (YoY)
      prevFiscalYear
        ? admin.from("income")
            .select("id, amount, date, source, notes, fiscal_year_id, property_id, contract_id, created_at")
            .eq("fiscal_year_id", prevFiscalYear.id)
            .order("date", { ascending: false })
            .limit(2000)
        : Promise.resolve({ data: [], error: null }),

      // 14. مصروفات السنة السابقة (YoY)
      prevFiscalYear
        ? admin.from("expenses")
            .select("id, amount, date, description, expense_type, fiscal_year_id, property_id, created_at")
            .eq("fiscal_year_id", prevFiscalYear.id)
            .order("date", { ascending: false })
            .limit(2000)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // ── تجميع الإعدادات ──
    const settings: Record<string, string> = {};
    (settingsRes.data || []).forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value;
    });

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
      prev_year: prevFiscalYear
        ? {
            fiscal_year_id: prevFiscalYear.id,
            label: prevFiscalYear.label,
            income: prevIncomeRes.data || [],
            expenses: prevExpensesRes.data || [],
          }
        : null,
      fetched_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), { headers: jsonHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطأ غير متوقع";
    console.error("dashboard-summary error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
