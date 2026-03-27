import { assertEquals, assert, assertStringIncludes, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildUBL,
  escapeXml,
  getInvoiceTypeInfo,
  getVatCategoryCode,
  getTaxExemptionInfo,
  type LineItemInput,
} from "./zatca-xml-builder.ts";

// ── إعدادات افتراضية ──
const defaultSettings: Record<string, string> = {
  vat_registration_number: "300000000000003",
  commercial_registration_number: "1010010000",
  waqf_name: "وقف اختباري",
  business_address_street: "شارع الملك فهد",
  business_address_building: "1234",
  business_address_city: "الرياض",
  business_address_postal_code: "12345",
  business_address_district: "حي العليا",
};

const baseInvoice: Record<string, unknown> = {
  invoice_number: "INV-TEST-001",
  invoice_type: "standard",
  date: "2026-03-15",
  icv: 1,
  zatca_uuid: "550e8400-e29b-41d4-a716-446655440000",
  created_at: "2026-03-15T10:30:00Z",
};

// ═══════════════════════════════════════════════════════════════
// getInvoiceTypeInfo
// ═══════════════════════════════════════════════════════════════

Deno.test("getInvoiceTypeInfo — standard invoice", () => {
  assertEquals(getInvoiceTypeInfo("standard"), { code: "388", name: "0100000" });
  assertEquals(getInvoiceTypeInfo("قياسية"), { code: "388", name: "0100000" });
});

Deno.test("getInvoiceTypeInfo — simplified invoice", () => {
  assertEquals(getInvoiceTypeInfo("simplified"), { code: "388", name: "0200000" });
  assertEquals(getInvoiceTypeInfo("مبسطة"), { code: "388", name: "0200000" });
});

Deno.test("getInvoiceTypeInfo — credit/debit notes", () => {
  assertEquals(getInvoiceTypeInfo("credit_note"), { code: "381", name: "0100000" });
  assertEquals(getInvoiceTypeInfo("إشعار دائن"), { code: "381", name: "0100000" });
  assertEquals(getInvoiceTypeInfo("debit_note"), { code: "383", name: "0100000" });
  assertEquals(getInvoiceTypeInfo("إشعار مدين"), { code: "383", name: "0100000" });
});

Deno.test("getInvoiceTypeInfo — simplified credit/debit", () => {
  assertEquals(getInvoiceTypeInfo("simplified_credit"), { code: "381", name: "0200000" });
  assertEquals(getInvoiceTypeInfo("simplified_debit"), { code: "383", name: "0200000" });
});

Deno.test("getInvoiceTypeInfo — unknown defaults to standard", () => {
  assertEquals(getInvoiceTypeInfo("unknown"), { code: "388", name: "0100000" });
});

// ═══════════════════════════════════════════════════════════════
// getVatCategoryCode
// ═══════════════════════════════════════════════════════════════

Deno.test("getVatCategoryCode — S for positive rate", () => {
  assertEquals(getVatCategoryCode(15), "S");
  assertEquals(getVatCategoryCode(5), "S");
});

Deno.test("getVatCategoryCode — E for zero with exemption", () => {
  assertEquals(getVatCategoryCode(0, "VATEX-SA-29-7"), "E");
});

Deno.test("getVatCategoryCode — Z for zero without exemption", () => {
  assertEquals(getVatCategoryCode(0), "Z");
  assertEquals(getVatCategoryCode(0, undefined), "Z");
});

// ═══════════════════════════════════════════════════════════════
// getTaxExemptionInfo
// ═══════════════════════════════════════════════════════════════

Deno.test("getTaxExemptionInfo — null for S category", () => {
  assertEquals(getTaxExemptionInfo("S"), null);
});

Deno.test("getTaxExemptionInfo — VATEX-SA-29-7 default for E", () => {
  const info = getTaxExemptionInfo("E");
  assertEquals(info?.code, "VATEX-SA-29-7");
});

Deno.test("getTaxExemptionInfo — extracts custom VATEX code", () => {
  const info = getTaxExemptionInfo("E", "VATEX-SA-32 خدمة معفاة");
  assertEquals(info?.code, "VATEX-SA-32");
});

Deno.test("getTaxExemptionInfo — VATEX-SA-32 for Z", () => {
  const info = getTaxExemptionInfo("Z");
  assertEquals(info?.code, "VATEX-SA-32");
});

// ═══════════════════════════════════════════════════════════════
// escapeXml
// ═══════════════════════════════════════════════════════════════

Deno.test("escapeXml — escapes all XML special chars", () => {
  assertEquals(escapeXml(`<tag attr="val">&'test'</tag>`),
    "&lt;tag attr=&quot;val&quot;&gt;&amp;&apos;test&apos;&lt;/tag&gt;");
});

Deno.test("escapeXml — preserves Arabic text", () => {
  assertEquals(escapeXml("إيجار عقاري سكني"), "إيجار عقاري سكني");
});

Deno.test("escapeXml — handles empty string", () => {
  assertEquals(escapeXml(""), "");
});

// ═══════════════════════════════════════════════════════════════
// buildUBL — التحقق من الرقم الضريبي
// ═══════════════════════════════════════════════════════════════

Deno.test("buildUBL — throws on invalid VAT number (too short)", () => {
  const badSettings = { ...defaultSettings, vat_registration_number: "12345" };
  assertThrows(
    () => buildUBL({ ...baseInvoice, amount_excluding_vat: 1000, vat_rate: 15 }, badSettings, ""),
    Error,
    "رقم التسجيل الضريبي غير صالح",
  );
});

Deno.test("buildUBL — throws on VAT not starting/ending with 3", () => {
  const badSettings = { ...defaultSettings, vat_registration_number: "100000000000001" };
  assertThrows(
    () => buildUBL({ ...baseInvoice, amount_excluding_vat: 1000, vat_rate: 15 }, badSettings, ""),
    Error,
    "رقم التسجيل الضريبي غير صالح",
  );
});

Deno.test("buildUBL — throws on empty VAT number", () => {
  const badSettings = { ...defaultSettings, vat_registration_number: "" };
  assertThrows(
    () => buildUBL({ ...baseInvoice, amount_excluding_vat: 1000, vat_rate: 15 }, badSettings, ""),
    Error,
    "رقم التسجيل الضريبي غير صالح",
  );
});

// ═══════════════════════════════════════════════════════════════
// buildUBL — بنود متعددة (Multi-line Items)
// ═══════════════════════════════════════════════════════════════

Deno.test("buildUBL — multi-line items: correct number of InvoiceLine elements", () => {
  const lineItems: LineItemInput[] = [
    { name: "إيجار شقة 101", quantity: 1, unit_price: 1500, vat_rate: 15 },
    { name: "إيجار شقة 102", quantity: 1, unit_price: 1200, vat_rate: 15 },
    { name: "إيجار محل تجاري", quantity: 1, unit_price: 5000, vat_rate: 15 },
  ];
  const xml = buildUBL({ ...baseInvoice, line_items: lineItems }, defaultSettings, "");
  const lineCount = (xml.match(/<cac:InvoiceLine>/g) || []).length;
  assertEquals(lineCount, 3, "يجب أن يحتوي على 3 بنود");
});

Deno.test("buildUBL — multi-line items: correct amounts", () => {
  const lineItems: LineItemInput[] = [
    { name: "بند أ", quantity: 2, unit_price: 1000, vat_rate: 15 },
    { name: "بند ب", quantity: 3, unit_price: 500, vat_rate: 15 },
  ];
  const xml = buildUBL({ ...baseInvoice, line_items: lineItems }, defaultSettings, "");
  // LineExtensionAmount = 2*1000 + 3*500 = 3500
  assertStringIncludes(xml, '<cbc:LineExtensionAmount currencyID="SAR">3500.00</cbc:LineExtensionAmount>');
  // VAT = 3500 * 0.15 = 525
  // TaxInclusiveAmount = 3500 + 525 = 4025
  assertStringIncludes(xml, '<cbc:TaxInclusiveAmount currencyID="SAR">4025.00</cbc:TaxInclusiveAmount>');
});

Deno.test("buildUBL — multi-line items: mixed VAT rates", () => {
  const lineItems: LineItemInput[] = [
    { name: "إيجار سكني", quantity: 1, unit_price: 2000, vat_rate: 0 },
    { name: "إيجار تجاري", quantity: 1, unit_price: 3000, vat_rate: 15 },
  ];
  const xml = buildUBL({ ...baseInvoice, line_items: lineItems }, defaultSettings, "");
  // Two TaxSubtotal elements (one for 0%, one for 15%)
  const subtotalCount = (xml.match(/<cac:TaxSubtotal>/g) || []).length;
  assertEquals(subtotalCount, 2, "يجب وجود TaxSubtotal لكل فئة ضريبية");
  // Total VAT = 0 + 450 = 450
  // Total inclusive = 5000 + 450 = 5450
  assertStringIncludes(xml, '<cbc:TaxInclusiveAmount currencyID="SAR">5450.00</cbc:TaxInclusiveAmount>');
});

Deno.test("buildUBL — multi-line items: each line has correct ID", () => {
  const lineItems: LineItemInput[] = [
    { name: "أ", quantity: 1, unit_price: 100, vat_rate: 15 },
    { name: "ب", quantity: 1, unit_price: 200, vat_rate: 15 },
  ];
  const xml = buildUBL({ ...baseInvoice, line_items: lineItems }, defaultSettings, "");
  assertStringIncludes(xml, "<cbc:ID>1</cbc:ID>");
  assertStringIncludes(xml, "<cbc:ID>2</cbc:ID>");
});

Deno.test("buildUBL — multi-line items: quantity with 6 decimal places", () => {
  const lineItems: LineItemInput[] = [
    { name: "خدمة", quantity: 2.5, unit_price: 100, vat_rate: 15 },
  ];
  const xml = buildUBL({ ...baseInvoice, line_items: lineItems }, defaultSettings, "");
  assertStringIncludes(xml, '2.500000</cbc:InvoicedQuantity>');
});

Deno.test("buildUBL — fallback single line when no line_items", () => {
  const xml = buildUBL({
    ...baseInvoice,
    amount_excluding_vat: 5000,
    vat_rate: 15,
    description: "إيجار شهري",
  }, defaultSettings, "");
  const lineCount = (xml.match(/<cac:InvoiceLine>/g) || []).length;
  assertEquals(lineCount, 1, "يجب إنشاء بند واحد عند عدم وجود line_items");
  assertStringIncludes(xml, "إيجار شهري");
});

// ═══════════════════════════════════════════════════════════════
// buildUBL — خصومات ورسوم (AllowanceCharge)
// ═══════════════════════════════════════════════════════════════

Deno.test("buildUBL — allowance (discount) reduces TaxExclusiveAmount", () => {
  const lineItems: LineItemInput[] = [
    { name: "إيجار", quantity: 1, unit_price: 10000, vat_rate: 15 },
  ];
  const xml = buildUBL({
    ...baseInvoice,
    line_items: lineItems,
    allowances: [{ reason: "خصم خاص", amount: 1000, vat_rate: 15 }],
  }, defaultSettings, "");
  // LineExtension = 10000, TaxExclusive = 10000 - 1000 = 9000
  assertStringIncludes(xml, '<cbc:TaxExclusiveAmount currencyID="SAR">9000.00</cbc:TaxExclusiveAmount>');
  assertStringIncludes(xml, '<cbc:AllowanceTotalAmount currencyID="SAR">1000.00</cbc:AllowanceTotalAmount>');
  assertStringIncludes(xml, "<cbc:ChargeIndicator>false</cbc:ChargeIndicator>");
  assertStringIncludes(xml, "خصم خاص");
});

Deno.test("buildUBL — charge increases TaxExclusiveAmount", () => {
  const lineItems: LineItemInput[] = [
    { name: "إيجار", quantity: 1, unit_price: 10000, vat_rate: 15 },
  ];
  const xml = buildUBL({
    ...baseInvoice,
    line_items: lineItems,
    charges: [{ reason: "رسوم صيانة", amount: 500, vat_rate: 15 }],
  }, defaultSettings, "");
  // TaxExclusive = 10000 + 500 = 10500
  assertStringIncludes(xml, '<cbc:TaxExclusiveAmount currencyID="SAR">10500.00</cbc:TaxExclusiveAmount>');
  assertStringIncludes(xml, '<cbc:ChargeTotalAmount currencyID="SAR">500.00</cbc:ChargeTotalAmount>');
  assertStringIncludes(xml, "<cbc:ChargeIndicator>true</cbc:ChargeIndicator>");
});

Deno.test("buildUBL — no AllowanceTotalAmount when no allowances", () => {
  const xml = buildUBL({
    ...baseInvoice,
    line_items: [{ name: "إيجار", quantity: 1, unit_price: 5000, vat_rate: 15 }],
  }, defaultSettings, "");
  assertEquals(xml.includes("AllowanceTotalAmount"), false);
  assertEquals(xml.includes("ChargeTotalAmount"), false);
});

// ═══════════════════════════════════════════════════════════════
// buildUBL — بنية XML العامة
// ═══════════════════════════════════════════════════════════════

Deno.test("buildUBL — contains all required UBL namespaces", () => {
  const xml = buildUBL({
    ...baseInvoice,
    line_items: [{ name: "بند", quantity: 1, unit_price: 1000, vat_rate: 15 }],
  }, defaultSettings, "");
  assertStringIncludes(xml, 'xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"');
  assertStringIncludes(xml, 'xmlns:cac=');
  assertStringIncludes(xml, 'xmlns:cbc=');
  assertStringIncludes(xml, 'xmlns:ext=');
});

Deno.test("buildUBL — PIH uses provided hash", () => {
  const xml = buildUBL({
    ...baseInvoice,
    line_items: [{ name: "بند", quantity: 1, unit_price: 1000, vat_rate: 15 }],
  }, defaultSettings, "customPreviousHash123==");
  assertStringIncludes(xml, "customPreviousHash123==");
});

Deno.test("buildUBL — PIH uses default when empty", () => {
  const xml = buildUBL({
    ...baseInvoice,
    line_items: [{ name: "بند", quantity: 1, unit_price: 1000, vat_rate: 15 }],
  }, defaultSettings, "");
  assertStringIncludes(xml, "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzlj");
});

Deno.test("buildUBL — two TaxTotal elements (first without subtotals, second with)", () => {
  const xml = buildUBL({
    ...baseInvoice,
    line_items: [{ name: "بند", quantity: 1, unit_price: 1000, vat_rate: 15 }],
  }, defaultSettings, "");
  const taxTotalMatches = xml.match(/<cac:TaxTotal>/g);
  assertEquals(taxTotalMatches?.length, 2, "يجب وجود عنصرين TaxTotal");
  // First TaxSubtotal appears in second TaxTotal
  const firstTaxTotal = xml.indexOf("<cac:TaxTotal>");
  const secondTaxTotal = xml.indexOf("<cac:TaxTotal>", firstTaxTotal + 1);
  const firstSubtotal = xml.indexOf("<cac:TaxSubtotal>", firstTaxTotal);
  assert(firstSubtotal > secondTaxTotal, "TaxSubtotal يجب أن يظهر في TaxTotal الثاني");
});

Deno.test("buildUBL — currency is always SAR", () => {
  const xml = buildUBL({
    ...baseInvoice,
    line_items: [{ name: "بند", quantity: 1, unit_price: 1000, vat_rate: 15 }],
  }, defaultSettings, "");
  assertStringIncludes(xml, "<cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>");
  assertStringIncludes(xml, "<cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>");
  // No other currency
  assertEquals(xml.includes('currencyID="USD"'), false);
});

Deno.test("buildUBL — credit note includes BillingReference", () => {
  const xml = buildUBL({
    ...baseInvoice,
    invoice_type: "credit_note",
    original_invoice_number: "INV-ORIG-001",
    line_items: [{ name: "إرجاع", quantity: 1, unit_price: 500, vat_rate: 15 }],
  }, defaultSettings, "");
  assertStringIncludes(xml, "<cac:BillingReference>");
  assertStringIncludes(xml, "INV-ORIG-001");
});

Deno.test("buildUBL — simplified invoice has no buyer address details", () => {
  const xml = buildUBL({
    ...baseInvoice,
    invoice_type: "simplified",
    tenant_name: "عميل نقدي",
    line_items: [{ name: "خدمة", quantity: 1, unit_price: 200, vat_rate: 15 }],
  }, defaultSettings, "");
  // No LatestDeliveryDate
  assertEquals(xml.includes("<cbc:LatestDeliveryDate>"), false);
  // No PartyIdentification for buyer
  const buyerSection = xml.split("AccountingCustomerParty")[1]?.split("AccountingCustomerParty")[0] || "";
  assertEquals(buyerSection.includes("PartyIdentification"), false);
});

Deno.test("buildUBL — standard invoice has buyer PostalAddress", () => {
  const xml = buildUBL({
    ...baseInvoice,
    invoice_type: "standard",
    buyer_id: "1234567890",
    buyer_street: "شارع فرعي",
    buyer_city: "جدة",
    line_items: [{ name: "إيجار", quantity: 1, unit_price: 1000, vat_rate: 15 }],
  }, defaultSettings, "");
  const buyerSection = xml.split("AccountingCustomerParty")[1] || "";
  assertStringIncludes(buyerSection, "<cbc:StreetName>شارع فرعي</cbc:StreetName>");
  assertStringIncludes(buyerSection, "<cbc:CityName>جدة</cbc:CityName>");
});
