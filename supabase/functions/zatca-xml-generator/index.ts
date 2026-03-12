import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Determine InvoiceTypeCode and name attribute based on invoice_type
 * Standard (B2B): code=388 name=0100000
 * Simplified (B2C): code=388 name=0200000
 * Debit Note: code=383
 * Credit Note: code=381
 */
function getInvoiceTypeInfo(invoiceType: string): { code: string; name: string } {
  const type = invoiceType?.toLowerCase();
  // Determine if it's a simplified variant
  const isSimplified = type === "simplified" || type === "مبسطة"
    || type === "simplified_credit" || type === "simplified_debit";

  switch (type) {
    case "simplified":
    case "مبسطة":
      return { code: "388", name: "0200000" };
    case "debit_note":
    case "إشعار مدين":
      return { code: "383", name: "0100000" };
    case "credit_note":
    case "إشعار دائن":
      return { code: "381", name: "0100000" };
    case "simplified_debit":
      return { code: "383", name: "0200000" };
    case "simplified_credit":
      return { code: "381", name: "0200000" };
    case "standard":
    case "قياسية":
    default:
      return { code: "388", name: "0100000" };
  }
}

/**
 * Determine VAT category code
 * S = Standard rate (15%)
 * Z = Zero-rated
 * E = Exempt
 * O = Out of scope
 */
function getVatCategoryCode(vatRate: number, vatExemptionReason?: string): string {
  if (vatRate > 0) return "S";
  if (vatExemptionReason) return "E";
  return "Z";
}

/**
 * Get tax exemption reason code and text for E/Z categories
 * Based on ZATCA VATEX codes for Saudi Arabia
 */
function getTaxExemptionInfo(vatCategoryCode: string, invoiceDescription?: string): { code: string; reason: string } | null {
  if (vatCategoryCode === "S") return null;
  if (vatCategoryCode === "E") {
    // Allow override via description containing VATEX code pattern
    const vatexMatch = invoiceDescription?.match(/VATEX-SA-[\d-]+/);
    if (vatexMatch) {
      return { code: vatexMatch[0], reason: invoiceDescription || "" };
    }
    // Default: real estate residential rental exemption
    return {
      code: "VATEX-SA-29-7",
      reason: "خدمات تأجير عقاري سكني معفاة من ضريبة القيمة المضافة",
    };
  }
  // Z = Zero-rated
  return {
    code: "VATEX-SA-32",
    reason: "توريدات خاضعة لنسبة صفر بالمائة",
  };
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUBL(
  inv: Record<string, unknown>,
  settings: Record<string, string>,
  previousInvoiceHash: string
): string {
  // --- Seller info from settings ---
  const vatNumber = settings.vat_registration_number || "";
  const crn = settings.commercial_registration_number || "";
  const sellerName = escapeXml(settings.waqf_name || "");
  const streetName = escapeXml(settings.business_address_street || "");
  const buildingNumber = settings.business_address_building || "";
  const cityName = escapeXml(settings.business_address_city || "");
  const postalZone = settings.business_address_postal_code || "";
  const districtName = escapeXml(settings.business_address_district || "");
  

  // --- Invoice data ---
  const invoiceNumber = escapeXml(String(inv.invoice_number || ""));
  const issueDate = String(inv.date || inv.due_date || new Date().toISOString().split("T")[0]);
  // Use invoice created_at time if available, otherwise current time
  const createdAt = inv.created_at ? new Date(String(inv.created_at)) : new Date();
  const issueTime = createdAt.toISOString().split("T")[1]?.split(".")[0] || "00:00:00";
  const amountExVat = Number(inv.amount_excluding_vat ?? inv.amount ?? 0);
  const vatAmount = Number(inv.vat_amount ?? 0);
  const total = amountExVat + vatAmount;
  const vatRate = Number(inv.vat_rate ?? 0);
  const currencyCode = "SAR";
  const uuid = String(inv.zatca_uuid || crypto.randomUUID());

  // --- Invoice type ---
  const invoiceType = String(inv.invoice_type || "standard");
  const typeInfo = getInvoiceTypeInfo(invoiceType);
  const vatCategoryCode = getVatCategoryCode(vatRate);
  const exemptionInfo = getTaxExemptionInfo(vatCategoryCode, String(inv.description || ""));

  // --- Buyer info (for Standard invoices) ---
  const buyerName = escapeXml(String(inv.tenant_name || inv.description || "عميل"));
  // Buyer ID type: CRN, NAT, IQA, PAS, TIN, MOM, MLS, SAG, GCC, 700
  const validBuyerIdTypes = ["CRN", "NAT", "IQA", "PAS", "TIN", "MOM", "MLS", "SAG", "GCC", "700"];
  const rawBuyerIdType = String(inv.buyer_id_type || "NAT").toUpperCase();
  const buyerIdType = validBuyerIdTypes.includes(rawBuyerIdType) ? rawBuyerIdType : "NAT";
  const isSimplified = typeInfo.name === "0200000";
  const isCreditOrDebit = typeInfo.code === "381" || typeInfo.code === "383";

  // --- Payment means ---
  const paymentMeansCode = String(inv.payment_means_code || "10");

  // --- PIH (Previous Invoice Hash) ---
  const pih = previousInvoiceHash || "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

  // --- Build XML ---
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
      <ext:ExtensionContent>
        <!-- Signature will be populated by zatca-signer -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoiceNumber}</cbc:ID>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${typeInfo.name}">${typeInfo.code}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currencyCode}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${currencyCode}</cbc:TaxCurrencyCode>
  <cbc:Note languageID="ar">${escapeXml(String(inv.notes || inv.description || "فاتورة"))}</cbc:Note>${isCreditOrDebit ? `
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(String(inv.original_invoice_number || inv.billing_reference_id || ""))}</cbc:ID>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>` : ""}
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${Number(inv.icv || 0)}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${pih}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain"><!-- QR will be populated by zatca-signer --></cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:Signature>
    <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
    <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${escapeXml(crn)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${streetName}</cbc:StreetName>
        <cbc:BuildingNumber>${buildingNumber}</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>${districtName}</cbc:CitySubdivisionName>
        <cbc:CityName>${cityName}</cbc:CityName>
        <cbc:PostalZone>${postalZone}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${sellerName}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>${!isSimplified ? `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${buyerIdType}">${escapeXml(String(inv.buyer_id || ""))}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(String(inv.buyer_street || ""))}</cbc:StreetName>
        <cbc:BuildingNumber>${escapeXml(String(inv.buyer_building || ""))}</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>${escapeXml(String(inv.buyer_district || ""))}</cbc:CitySubdivisionName>
        <cbc:CityName>${escapeXml(String(inv.buyer_city || ""))}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(String(inv.buyer_postal || ""))}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(String(inv.buyer_vat || ""))}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${buyerName}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>` : `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${buyerName}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>`}
  <cac:Delivery>
    <cbc:ActualDeliveryDate>${issueDate}</cbc:ActualDeliveryDate>${!isSimplified ? `
    <cbc:LatestDeliveryDate>${String(inv.latest_delivery_date || inv.end_date || issueDate)}</cbc:LatestDeliveryDate>` : ""}
  </cac:Delivery>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${paymentMeansCode}</cbc:PaymentMeansCode>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currencyCode}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currencyCode}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currencyCode}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeID="UN/ECE 5305" schemeAgencyID="6">${vatCategoryCode}</cbc:ID>
        <cbc:Percent>${Number(vatRate).toFixed(2)}</cbc:Percent>${exemptionInfo ? `
        <cbc:TaxExemptionReasonCode>${exemptionInfo.code}</cbc:TaxExemptionReasonCode>
        <cbc:TaxExemptionReason>${exemptionInfo.reason}</cbc:TaxExemptionReason>` : ""}
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currencyCode}">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    
    <cbc:PrepaidAmount currencyID="${currencyCode}">0.00</cbc:PrepaidAmount>
    <cbc:PayableAmount currencyID="${currencyCode}">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="MON">1.000000</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currencyCode}">${vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="${currencyCode}">${total.toFixed(2)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${escapeXml(String(inv.description || "إيجار عقاري"))}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID schemeID="UN/ECE 5305" schemeAgencyID="6">${vatCategoryCode}</cbc:ID>
        <cbc:Percent>${Number(vatRate).toFixed(2)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID schemeID="UN/ECE 5153" schemeAgencyID="6">VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currencyCode}">${amountExVat.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
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

    // Check admin/accountant role
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

    // Fetch all ZATCA-relevant settings
    const settingKeys = [
      "vat_registration_number", "waqf_name", "commercial_registration_number",
      "business_address_street", "business_address_building",
      "business_address_city", "business_address_postal_code",
      "business_address_district", "business_address_province",
    ];
    const { data: settingsRows } = await admin.from("app_settings").select("key, value").in("key", settingKeys);
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((s: { key: string; value: string }) => { settings[s.key] = s.value; });

    // Get previous invoice hash for PIH
    const { data: lastChain } = await admin
      .from("invoice_chain")
      .select("invoice_hash")
      .order("icv", { ascending: false })
      .limit(1)
      .single();
    const previousHash = lastChain?.invoice_hash || "";

    // For payment_invoices, add tenant_name from contract
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
        invRec.buyer_tax_number = (contract as Record<string, unknown>).tenant_tax_number || "";
        invRec.buyer_crn = (contract as Record<string, unknown>).tenant_crn || "";
        invRec.buyer_street = contract.tenant_street || "";
        invRec.buyer_building = contract.tenant_building || "";
        invRec.buyer_district = contract.tenant_district || "";
        invRec.buyer_city = contract.tenant_city || "";
        invRec.buyer_postal = contract.tenant_postal_code || "";
      }
      // Default to simplified for payment invoices
      if (!inv.invoice_type) {
        (inv as Record<string, unknown>).invoice_type = "simplified";
      }
    }

    const xml = buildUBL(inv as Record<string, unknown>, settings, previousHash);

    // Save XML to invoice — works for both tables if zatca_xml column exists
    if (table === "invoices") {
      await admin.from("invoices").update({ zatca_xml: xml }).eq("id", invoice_id);
    } else if (table === "payment_invoices") {
      await admin.from("payment_invoices").update({ zatca_xml: xml } as Record<string, unknown>).eq("id", invoice_id);
    }

    return new Response(JSON.stringify({ success: true, xml_length: xml.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('zatca-xml-generator error:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
