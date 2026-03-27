import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { buildUBL } from "../_shared/zatca-xml-builder.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Zod schema للتحقق من المدخلات ---
const RequestSchema = z.object({
  invoice_id: z.string().uuid("invoice_id يجب أن يكون UUID صالحاً"),
  table: z.enum(["invoices", "payment_invoices"], {
    errorMap: () => ({ message: "table يجب أن يكون invoices أو payment_invoices" }),
  }),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // --- التحقق من Content-Type ---
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), { status: 415, headers: jsonHeaders });
    }

    // --- المصادقة ---
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const supaAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supaAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // --- فحص الدور ---
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "accountant"]);
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: jsonHeaders });
    }

    // --- تقييد معدل الطلبات: 30 طلب/دقيقة ---
    const { data: isLimited } = await admin.rpc('check_rate_limit', {
      p_key: `zatca-xml:${user.id}`, p_limit: 30, p_window_seconds: 60
    });
    if (isLimited) {
      return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح من الطلبات. حاول بعد دقيقة." }), { status: 429, headers: jsonHeaders });
    }

    // --- التحقق من المدخلات بـ Zod ---
    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid parameters", details: parsed.error.flatten().fieldErrors }), { status: 400, headers: jsonHeaders });
    }
    const { invoice_id, table } = parsed.data;

    // --- جلب الفاتورة ---
    const { data: inv, error: invErr } = await admin.from(table).select("*").eq("id", invoice_id).single();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: jsonHeaders });
    }

    // --- جلب إعدادات ZATCA ---
    const settingKeys = [
      "vat_registration_number", "waqf_name", "commercial_registration_number",
      "business_address_street", "business_address_building",
      "business_address_city", "business_address_postal_code",
      "business_address_district", "business_address_province",
      "default_vat_rate",
    ];
    const { data: settingsRows } = await admin.from("app_settings").select("key, value").in("key", settingKeys);
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((s: { key: string; value: string }) => { settings[s.key] = s.value; });

    // --- جلب بنود الفاتورة من invoice_items إن وجدت ---
    const { data: dbLineItems } = await admin
      .from("invoice_items")
      .select("item_name, quantity, unit_price, vat_rate")
      .eq("invoice_id", invoice_id)
      .eq("invoice_source", table)
      .order("sort_order", { ascending: true });
    if (dbLineItems && dbLineItems.length > 0) {
      (inv as Record<string, unknown>).line_items = dbLineItems.map((li: { item_name: string; quantity: number; unit_price: number; vat_rate: number }) => ({
        name: li.item_name,
        quantity: li.quantity,
        unit_price: li.unit_price,
        vat_rate: li.vat_rate,
        unit_code: "MON",
      }));
    }

    // --- جلب آخر هاش لسلسلة الفواتير (PIH) ---
    const { data: lastChain } = await admin
      .from("invoice_chain")
      .select("invoice_hash")
      .neq("invoice_hash", "PENDING")
      .order("icv", { ascending: false })
      .limit(1)
      .single();
    const previousHash = lastChain?.invoice_hash || "";

    // --- إضافة بيانات المستأجر لفواتير الدفعات ---
    if (table === "payment_invoices" && inv.contract_id) {
      const { data: contract } = await admin
        .from("contracts")
        .select("tenant_name, tenant_id_type, tenant_id_number, tenant_tax_number, tenant_crn, tenant_street, tenant_building, tenant_district, tenant_city, tenant_postal_code")
        .eq("id", inv.contract_id)
        .single();
      if (contract) {
        const invRec = inv as Record<string, unknown>;
        invRec.tenant_name = contract.tenant_name;
        invRec.buyer_id_type = contract.tenant_id_type || "NAT";
        invRec.buyer_id = contract.tenant_id_number || "";
        invRec.buyer_vat = (contract as Record<string, unknown>).tenant_tax_number || "";
        invRec.buyer_crn = (contract as Record<string, unknown>).tenant_crn || "";
        invRec.buyer_street = contract.tenant_street || "";
        invRec.buyer_building = contract.tenant_building || "";
        invRec.buyer_district = contract.tenant_district || "";
        invRec.buyer_city = contract.tenant_city || "";
        invRec.buyer_postal = contract.tenant_postal_code || "";
      }
      if (!inv.invoice_type) {
        (inv as Record<string, unknown>).invoice_type = "simplified";
      }
    }

    // --- بناء XML ---
    const xml = buildUBL(inv as Record<string, unknown>, settings, previousHash);

    // --- حفظ XML في الفاتورة ---
    if (table === "invoices") {
      await admin.from("invoices").update({ zatca_xml: xml }).eq("id", invoice_id);
    } else if (table === "payment_invoices") {
      await admin.from("payment_invoices").update({ zatca_xml: xml } as Record<string, unknown>).eq("id", invoice_id);
    }

    return new Response(JSON.stringify({ success: true, xml_length: xml.length }), { headers: jsonHeaders });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[zatca-xml-generator]', JSON.stringify({ error: errorMessage, timestamp: new Date().toISOString() }));
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب" }), { status: 500, headers: jsonHeaders });
  }
});
