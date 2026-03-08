import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

import { getCorsHeaders } from "../_shared/cors.ts";

function buildUBL(inv: Record<string, unknown>, settings: Record<string, string>): string {
  const vatNumber = settings.vat_number || "";
  const sellerName = settings.waqf_name || "";
  const invoiceNumber = inv.invoice_number || "";
  const issueDate = inv.date || new Date().toISOString().split("T")[0];
  const amountExVat = Number(inv.amount_excluding_vat ?? inv.amount ?? 0);
  const vatAmount = Number(inv.vat_amount ?? 0);
  const total = amountExVat + vatAmount;
  const vatRate = Number(inv.vat_rate ?? 0);
  const currencyCode = "SAR";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:UUID>${inv.zatca_uuid || crypto.randomUUID()}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currencyCode}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${vatNumber}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${sellerName}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${vatNumber}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currencyCode}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currencyCode}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${vatRate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:TaxExclusiveAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currencyCode}">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currencyCode}">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>إيجار عقاري</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supaAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supaAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check admin role
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "accountant"]);
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { invoice_id, table } = await req.json();
    if (!invoice_id || !table || !["invoices", "payment_invoices"].includes(table)) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch invoice
    const { data: inv, error: invErr } = await admin.from(table).select("*").eq("id", invoice_id).single();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch ZATCA settings
    const { data: settingsRows } = await admin.from("app_settings").select("key, value").in("key", ["vat_number", "waqf_name"]);
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((s: { key: string; value: string }) => { settings[s.key] = s.value; });

    const xml = buildUBL(inv, settings);

    // Save XML to invoice
    if (table === "invoices") {
      await admin.from("invoices").update({ zatca_xml: xml }).eq("id", invoice_id);
    }
    // payment_invoices doesn't have zatca_xml column — store in notes or skip
    
    return new Response(JSON.stringify({ success: true, xml_length: xml.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
