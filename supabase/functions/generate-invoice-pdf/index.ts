import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import QRCode from "npm:qrcode@1.5.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Arabic Labels ───────────────────────────────────────────────
const TYPE_AR: Record<string, string> = {
  utilities: "مرافق",
  maintenance: "صيانة",
  rent: "إيجار",
  other: "أخرى",
};

const STATUS_AR: Record<string, string> = {
  pending: "معلّقة",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

// ─── Arabic Reshaper (مستورد من _shared) ─────────────────────────
import { processArabicText } from "../_shared/arabic-reshaper.ts";

// ─── PDF Generation ──────────────────────────────────────────────

const FONT_BASE_URL = `${Deno.env.get("SUPABASE_URL")!}/storage/v1/object/public/waqf-assets/fonts`;

// Module-level font cache — works within the same Deno Deploy warm isolate.
// On cold starts, fonts are re-fetched (~200ms). This is acceptable and expected.
let cachedFonts: { regular: Uint8Array; bold: Uint8Array } | null = null;

async function getFonts(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  if (!cachedFonts) {
    const [regular, bold] = await Promise.all([
      fetchFont("Amiri-Regular.ttf"),
      fetchFont("Amiri-Bold.ttf"),
    ]);
    cachedFonts = { regular, bold };
  }
  return cachedFonts;
}

async function fetchFont(name: string, retries = 3): Promise<Uint8Array> {
  const url = `${FONT_BASE_URL}/${name}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      // فحص سلامة الخط — الحد الأدنى 1000 بايت
      if (buf.length < 1000) throw new Error(`Font too small (${buf.length} bytes)`);
      return buf;
    } catch (err) {
      if (attempt === retries) {
        // تصفير الكاش عند الفشل النهائي
        cachedFonts = null;
        throw new Error(
          `Failed to fetch font ${name} after ${retries} attempts: ${err instanceof Error ? err.message : String(err)}`,
          { cause: err }
        );
      }
      // تأخير متزايد قبل إعادة المحاولة
      await new Promise(r => setTimeout(r, attempt * 500));
    }
  }
  throw new Error(`Unreachable: fetchFont ${name}`);
}

interface InvoiceData {
  invoice_number: string | null;
  invoice_type: string;
  amount: number;
  date: string;
  description: string | null;
  status: string;
  vat_rate: number;
  vat_amount: number;
  amount_excluding_vat: number | null;
}

// ─── ZATCA QR TLV (shared single source of truth) ────────────────
import { generateZatcaQrTLV } from "../_shared/zatca-qr-tlv.ts";

interface WaqfSettings {
  waqf_name: string;
  waqf_deed_number: string;
  waqf_court: string;
  waqf_admin: string;
  vat_registration_number: string;
  waqf_logo_url: string;
  waqf_bank_name: string;
  waqf_bank_iban: string;
  business_address: string;
  commercial_registration_number: string;
}

async function fetchWaqfSettings(adminClient: SupabaseClient): Promise<WaqfSettings> {
  const keys = [
    'waqf_name', 'waqf_deed_number', 'waqf_court', 'waqf_admin',
    'vat_registration_number', 'waqf_logo_url', 'waqf_bank_name', 'waqf_bank_iban',
    'business_address_street', 'business_address_district', 'business_address_city',
    'business_address_postal_code', 'commercial_registration_number',
  ];
  const { data } = await adminClient
    .from('app_settings')
    .select('key, value')
    .in('key', keys);

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  // بناء العنوان من الحقول المتاحة
  const addressParts = [
    map.business_address_street,
    map.business_address_district,
    map.business_address_city,
    map.business_address_postal_code,
  ].filter(Boolean);

  return {
    waqf_name: map.waqf_name || 'غير محدد',
    waqf_deed_number: map.waqf_deed_number || 'غير محدد',
    waqf_court: map.waqf_court || 'غير محدد',
    waqf_admin: map.waqf_admin || 'غير محدد',
    vat_registration_number: map.vat_registration_number || '',
    waqf_logo_url: map.waqf_logo_url || '',
    waqf_bank_name: map.waqf_bank_name || '',
    waqf_bank_iban: map.waqf_bank_iban || '',
    business_address: addressParts.length > 0 ? addressParts.join('، ') : '',
    commercial_registration_number: map.commercial_registration_number || '',
  };
}

async function generateInvoicePdf(invoice: InvoiceData, waqfSettings: WaqfSettings): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Use cached fonts
  const fonts = await getFonts();
  const amiri = await pdfDoc.embedFont(fonts.regular, { subset: true });
  const amiriBold = await pdfDoc.embedFont(fonts.bold, { subset: true });
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;

  // Colors
  const darkGreen = rgb(0.05, 0.35, 0.15);
  const gold = rgb(0.72, 0.58, 0.2);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const medGray = rgb(0.6, 0.6, 0.6);
  const black = rgb(0, 0, 0);

  // ── Gold border ──
  const bw = 2;
  page.drawRectangle({ x: margin - 10, y: margin - 10, width: width - 2 * margin + 20, height: height - 2 * margin + 20, borderColor: gold, borderWidth: bw });

  // ── Green header bar ──
  const headerH = 70;
  const headerY = height - margin - headerH;
  page.drawRectangle({ x: margin, y: headerY, width: width - 2 * margin, height: headerH, color: darkGreen });

  // Header text (waqf name — dynamic)
  const headerText = processArabicText(waqfSettings.waqf_name);
  const headerW = amiriBold.widthOfTextAtSize(headerText, 20);
  page.drawText(headerText, {
    x: width - margin - 15 - headerW,
    y: headerY + 40,
    size: 20,
    font: amiriBold,
    color: rgb(1, 1, 1),
  });

  const subText = processArabicText("نظام إدارة الوقف");
  const subW = amiri.widthOfTextAtSize(subText, 12);
  page.drawText(subText, {
    x: width - margin - 15 - subW,
    y: headerY + 15,
    size: 12,
    font: amiri,
    color: rgb(0.9, 0.85, 0.6),
  });

  // ── Waqf details (dynamic) ──
  let y = headerY - 30;
  const detailLines = [
    `رقم الصك: ${waqfSettings.waqf_deed_number}`,
    `المحكمة: ${waqfSettings.waqf_court}`,
    `الناظر: ${waqfSettings.waqf_admin}`,
  ];

  // Add VAT registration number if available
  if (waqfSettings.vat_registration_number) {
    detailLines.push(`الرقم الضريبي: ${waqfSettings.vat_registration_number}`);
  }
  if (waqfSettings.commercial_registration_number) {
    detailLines.push(`السجل التجاري: ${waqfSettings.commercial_registration_number}`);
  }
  if (waqfSettings.business_address) {
    detailLines.push(`العنوان: ${waqfSettings.business_address}`);
  }
  if (waqfSettings.waqf_bank_iban) {
    detailLines.push(`IBAN: ${waqfSettings.waqf_bank_iban}${waqfSettings.waqf_bank_name ? ` (${waqfSettings.waqf_bank_name})` : ''}`);
  }

  for (const line of detailLines) {
    const shaped = processArabicText(line);
    const tw = amiri.widthOfTextAtSize(shaped, 11);
    page.drawText(shaped, {
      x: width - margin - 15 - tw,
      y,
      size: 11,
      font: amiri,
      color: medGray,
    });
    y -= 18;
  }

  // ── Separator ──
  y -= 5;
  page.drawLine({ start: { x: margin + 10, y }, end: { x: width - margin - 10, y }, thickness: 1, color: gold });
  y -= 30;

  // ── Invoice title ──
  const invNum = invoice.invoice_number || "N/A";
  const isVatInvoice = invoice.vat_rate > 0;
  const titleLabel = isVatInvoice ? "فاتورة ضريبية مبسّطة" : "فاتورة";
  const titleText = processArabicText(titleLabel);
  const titleW = amiriBold.widthOfTextAtSize(titleText, 18);
  const numW = helvetica.widthOfTextAtSize(` ${invNum}`, 16);
  const totalTitleW = titleW + numW;
  const titleX = (width - totalTitleW) / 2;

  page.drawText(` ${invNum}`, { x: titleX, y, size: 16, font: helvetica, color: darkGreen });
  page.drawText(titleText, { x: titleX + numW, y, size: 18, font: amiriBold, color: darkGreen });
  y -= 35;

  // ── Table ──
  const tableX = margin + 15;
  const tableW = width - 2 * margin - 30;
  const colValueX = tableX;
  const colLabelX = tableX + tableW;
  const rowH = 30;

  // تنسيق الأرقام المالية بالعربية
  const fmtNum = (n: number) => n.toLocaleString("ar-SA", { minimumFractionDigits: 2 });

  // fallback لنوع الفاتورة عند payment_invoices (لا يحتوي على invoice_type)
  const typeLabel = TYPE_AR[invoice.invoice_type] || (invoice.invoice_type ? invoice.invoice_type : 'إيجار');

  const rows: [string, string][] = [
    ["رقم الفاتورة", invNum],
    ["النوع", typeLabel],
  ];

  // VAT conditional rows
  if (isVatInvoice) {
    const amountExVat = invoice.amount_excluding_vat ?? (invoice.amount - invoice.vat_amount);
    rows.push(["المبلغ قبل الضريبة (ر.س)", fmtNum(amountExVat)]);
    rows.push([`ضريبة القيمة المضافة (${invoice.vat_rate}%)`, fmtNum(invoice.vat_amount)]);
    rows.push(["الإجمالي شاملاً الضريبة (ر.س)", fmtNum(invoice.amount)]);
  } else {
    rows.push(["المبلغ (ر.س)", fmtNum(invoice.amount)]);
    rows.push(["ضريبة القيمة المضافة", "معفاة"]);
  }

  rows.push(["التاريخ", invoice.date]);
  rows.push(["الوصف", (() => { const d = invoice.description || "—"; return d.length > 47 ? d.substring(0, 47) + "..." : d; })()]);
  rows.push(["الحالة", STATUS_AR[invoice.status] || invoice.status]);

  // Table header
  page.drawRectangle({ x: tableX, y: y - rowH + 8, width: tableW, height: rowH, color: darkGreen });

  const hdrLabel = processArabicText("الحقل");
  const hdrLabelW = amiriBold.widthOfTextAtSize(hdrLabel, 12);
  page.drawText(hdrLabel, { x: colLabelX - 10 - hdrLabelW, y: y - 12, size: 12, font: amiriBold, color: rgb(1, 1, 1) });

  const hdrValue = processArabicText("القيمة");
  page.drawText(hdrValue, { x: colValueX + 10, y: y - 12, size: 12, font: amiriBold, color: rgb(1, 1, 1) });

  y -= rowH;

  // Table rows
  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];
    const bgColor = i % 2 === 0 ? lightGray : rgb(1, 1, 1);

    page.drawRectangle({ x: tableX, y: y - rowH + 8, width: tableW, height: rowH, color: bgColor });

    // Label (right-aligned)
    const shapedLabel = processArabicText(label);
    const labelW = amiri.widthOfTextAtSize(shapedLabel, 11);
    page.drawText(shapedLabel, { x: colLabelX - 10 - labelW, y: y - 12, size: 11, font: amiri, color: black });

    // Value
    const isArabicValue = /[\u0600-\u06FF]/.test(value);
    if (isArabicValue) {
      const shapedValue = processArabicText(value);
      page.drawText(shapedValue, { x: colValueX + 10, y: y - 12, size: 11, font: amiri, color: black });
    } else {
      page.drawText(value, { x: colValueX + 10, y: y - 12, size: 11, font: helvetica, color: black });
    }

    y -= rowH;
  }

  // ── QR Code for VAT invoices ──
  if (isVatInvoice && waqfSettings.vat_registration_number) {
    try {
      const invRecord = invoice as unknown as Record<string, unknown>;
      
      // Extract QR TLV from signed XML (the authoritative source with Tags 6-9)
      let tlvBase64 = "";
      const zatcaXml = invRecord.zatca_xml ? String(invRecord.zatca_xml) : "";
      if (zatcaXml) {
        const qrMatch = zatcaXml.match(
          /<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<cbc:EmbeddedDocumentBinaryObject[^>]*>([^<]+)<\/cbc:EmbeddedDocumentBinaryObject>/
        );
        if (qrMatch && qrMatch[1] && !qrMatch[1].includes("<!--")) {
          tlvBase64 = qrMatch[1].trim();
        }
      }
      
      // Fall back to basic Tags 1-5 QR if no signed QR in XML
      if (!tlvBase64) {
        tlvBase64 = generateZatcaQrTLV(
          waqfSettings.waqf_name,
          waqfSettings.vat_registration_number,
          new Date().toISOString(),
          invoice.amount,
          invoice.vat_amount,
        );
      }

      // Generate QR code as data URL, then extract PNG bytes
      const qrDataUrl: string = await QRCode.toDataURL(tlvBase64, {
        width: 150,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
      
      // Extract base64 PNG from data URL
      const base64Data = qrDataUrl.split(',')[1];
      const qrBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      
      // Draw QR code centered
      const qrSize = 80;
      const qrX = (width - qrSize) / 2;
      page.drawImage(qrImage, { x: qrX, y: y - qrSize - 5, width: qrSize, height: qrSize });
      y -= qrSize + 15;
    } catch (qrErr) {
      console.error("QR generation failed:", qrErr instanceof Error ? qrErr.message : String(qrErr));
      // Continue without QR if it fails
    }
  }

  // ── Bottom separator ──
  y -= 15;
  page.drawLine({ start: { x: margin + 10, y }, end: { x: width - margin - 10, y }, thickness: 1, color: gold });
  y -= 25;

  // ── Footer ──
  const generated = new Date().toISOString().split("T")[0];
  const footerText = processArabicText(`تاريخ التوليد: ${generated}`);
  const footerW = amiri.widthOfTextAtSize(footerText, 9);
  page.drawText(footerText, { x: width - margin - 15 - footerW, y, size: 9, font: amiri, color: medGray });

  return await pdfDoc.save();
}

// ─── HTTP Handler ────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // جلب المستخدم + تحليل الجسم بالتوازي
    const [authResult, bodyData] = await Promise.all([
      supabaseAuth.auth.getUser(),
      req.json().catch(() => ({})),
    ]);
    const { data: { user: authUser }, error: userError } = authResult;
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userId = authUser.id;

    // التحقق من الدور + Rate limiting بالتوازي
    const [rateLimitRes, rolesRes] = await Promise.all([
      supabaseAdmin.rpc("check_rate_limit", {
        p_key: `pdf_gen_${userId}`,
        p_limit: 10,
        p_window_seconds: 60,
      }),
      supabaseAdmin.from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "accountant"]),
    ]);

    if (rateLimitRes.data === true) {
      return new Response(JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات. حاول بعد دقيقة." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rolesRes.data || rolesRes.data.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_ids, table: sourceTable, force_regenerate } = bodyData;
    // دعم جدول payment_invoices أو invoices (الافتراضي)
    const tableName = sourceTable === "payment_invoices" ? "payment_invoices" : "invoices";
    const forceRegenerate = force_regenerate === true;

    if (!invoice_ids || !Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return new Response(JSON.stringify({ error: "invoice_ids array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice_ids.length > 20) {
      return new Response(JSON.stringify({ error: "Maximum 20 invoices at a time" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = invoice_ids.filter((id: unknown) => typeof id !== "string" || !UUID_RE.test(id));
    if (invalidIds.length > 0) {
      return new Response(JSON.stringify({ error: "صيغة معرّف الفاتورة غير صالحة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invoices, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select("*")
      .in("id", invoice_ids);

    if (fetchError) throw fetchError;
    if (!invoices || invoices.length === 0) {
      return new Response(JSON.stringify({ error: "No invoices found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; invoice_number: string | null; success: boolean; error?: string }[] = [];

    // Fetch waqf settings once for all invoices
    const waqfSettings = await fetchWaqfSettings(supabaseAdmin);

    for (const invoice of invoices) {
      try {
        // تخطي الفواتير التي لديها ملف فقط إذا لم يُطلب إعادة التوليد
        if (invoice.file_path && !forceRegenerate) {
          results.push({ id: invoice.id, invoice_number: invoice.invoice_number, success: true, error: "already has file" });
          continue;
        }

        const pdfBytes = await generateInvoicePdf({
          invoice_number: invoice.invoice_number,
          invoice_type: invoice.invoice_type,
          amount: invoice.amount,
          date: invoice.date,
          description: invoice.description,
          status: invoice.status,
          vat_rate: invoice.vat_rate ?? 0,
          vat_amount: invoice.vat_amount ?? 0,
          amount_excluding_vat: invoice.amount_excluding_vat ?? null,
        }, waqfSettings);

        // تعقيم اسم الملف لمنع path traversal
        const rawName = (invoice.invoice_number || invoice.id) as string;
        const safeName = rawName.replace(/[./\\]+/g, '_');
        const fileName = `${safeName}.pdf`;
        const storagePath = `generated/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("invoices")
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // تحديث مسار الملف في الجدول الصحيح
        const updateData: Record<string, string> = { file_path: storagePath };
        if (tableName === "invoices") updateData.file_name = fileName;
        const { error: updateError } = await supabaseAdmin
          .from(tableName)
          .update(updateData)
          .eq("id", invoice.id);

        if (updateError) throw updateError;

        results.push({ id: invoice.id, invoice_number: invoice.invoice_number, success: true });
      } catch (err) {
        console.error("generate-invoice-pdf item error:", err instanceof Error ? err.message : String(err));
        results.push({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          success: false,
          error: "فشل توليد الفاتورة",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-invoice-pdf error:", err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: "حدث خطأ في معالجة الفواتير" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
