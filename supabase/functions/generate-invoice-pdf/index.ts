import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";
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

// ─── Arabic Reshaper ─────────────────────────────────────────────
// Maps Unicode code-points → contextual Presentation Forms-B glyphs
// Format: [isolated, final, initial, medial]
const ARABIC_FORMS: Record<number, number[]> = {
  0x0621: [0xFE80, 0xFE80, 0xFE80, 0xFE80], // ء hamza
  0x0622: [0xFE81, 0xFE82, 0xFE81, 0xFE82], // آ
  0x0623: [0xFE83, 0xFE84, 0xFE83, 0xFE84], // أ
  0x0624: [0xFE85, 0xFE86, 0xFE85, 0xFE86], // ؤ
  0x0625: [0xFE87, 0xFE88, 0xFE87, 0xFE88], // إ
  0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], // ئ
  0x0627: [0xFE8D, 0xFE8E, 0xFE8D, 0xFE8E], // ا
  0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92], // ب
  0x0629: [0xFE93, 0xFE94, 0xFE93, 0xFE94], // ة
  0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98], // ت
  0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], // ث
  0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], // ج
  0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], // ح
  0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], // خ
  0x062F: [0xFEA9, 0xFEAA, 0xFEA9, 0xFEAA], // د
  0x0630: [0xFEAB, 0xFEAC, 0xFEAB, 0xFEAC], // ذ
  0x0631: [0xFEAD, 0xFEAE, 0xFEAD, 0xFEAE], // ر
  0x0632: [0xFEAF, 0xFEB0, 0xFEAF, 0xFEB0], // ز
  0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], // س
  0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], // ش
  0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], // ص
  0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], // ض
  0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], // ط
  0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], // ظ
  0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC], // ع
  0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0], // غ
  0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4], // ف
  0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8], // ق
  0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // ك
  0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], // ل
  0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], // م
  0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], // ن
  0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], // ه
  0x0648: [0xFEED, 0xFEEE, 0xFEED, 0xFEEE], // و
  0x0649: [0xFEEF, 0xFEF0, 0xFEEF, 0xFEF0], // ى
  0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // ي
  // Lam-Alef ligatures handled separately
};

// Characters that do NOT connect to the next letter
const RIGHT_JOIN_ONLY = new Set([
  0x0627, 0x0622, 0x0623, 0x0625, 0x062F, 0x0630,
  0x0631, 0x0632, 0x0648, 0x0624, 0x0629, 0x0649,
]);

// Tashkeel / diacritics — pass through without affecting joining
const TASHKEEL = new Set([
  0x064B, 0x064C, 0x064D, 0x064E, 0x064F, 0x0650,
  0x0651, 0x0652, 0x0670,
]);

function isArabicLetter(cp: number): boolean {
  return cp >= 0x0621 && cp <= 0x064A && !TASHKEEL.has(cp);
}

function reshapeArabic(text: string): string {
  const codePoints = [...text].map((c) => c.codePointAt(0)!);
  const result: number[] = [];

  for (let i = 0; i < codePoints.length; i++) {
    const cp = codePoints[i];

    if (TASHKEEL.has(cp)) {
      result.push(cp);
      continue;
    }

    if (!isArabicLetter(cp) || !ARABIC_FORMS[cp]) {
      result.push(cp);
      continue;
    }

    // Determine joining context (skip tashkeel when looking for neighbours)
    let prevIdx = i - 1;
    while (prevIdx >= 0 && TASHKEEL.has(codePoints[prevIdx])) prevIdx--;
    let nextIdx = i + 1;
    while (nextIdx < codePoints.length && TASHKEEL.has(codePoints[nextIdx])) nextIdx++;

    const prevCP = prevIdx >= 0 ? codePoints[prevIdx] : 0;
    const nextCP = nextIdx < codePoints.length ? codePoints[nextIdx] : 0;

    const prevJoins = isArabicLetter(prevCP) && ARABIC_FORMS[prevCP] && !RIGHT_JOIN_ONLY.has(prevCP);
    const nextJoins = isArabicLetter(nextCP) && ARABIC_FORMS[nextCP] !== undefined;

    // Lam-Alef ligatures
    if (cp === 0x0644 && nextJoins) {
      const ncp = nextCP;
      if (ncp === 0x0627) { result.push(prevJoins ? 0xFEFC : 0xFEFB); i = nextIdx; continue; }
      if (ncp === 0x0622) { result.push(prevJoins ? 0xFEF6 : 0xFEF5); i = nextIdx; continue; }
      if (ncp === 0x0623) { result.push(prevJoins ? 0xFEF8 : 0xFEF7); i = nextIdx; continue; }
      if (ncp === 0x0625) { result.push(prevJoins ? 0xFEFA : 0xFEF9); i = nextIdx; continue; }
    }

    const forms = ARABIC_FORMS[cp];
    let form: number;
    if (prevJoins && nextJoins) form = forms[3]; // medial
    else if (prevJoins) form = forms[1]; // final
    else if (nextJoins) form = forms[2]; // initial
    else form = forms[0]; // isolated

    result.push(form);
  }

  return String.fromCodePoint(...result);
}

/** Reverse only for visual RTL rendering. Numbers/Latin kept LTR within runs. */
function visualRTL(text: string): string {
  // Split into runs of Arabic vs non-Arabic
  const runs: { text: string; isArabic: boolean }[] = [];
  let current = "";
  let currentIsArabic = false;

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const arabic =
      (cp >= 0x0600 && cp <= 0x06FF) ||
      (cp >= 0xFB50 && cp <= 0xFDFF) ||
      (cp >= 0xFE70 && cp <= 0xFEFF);

    if (current.length === 0) {
      currentIsArabic = arabic;
      current = ch;
    } else if (arabic === currentIsArabic || ch === " ") {
      current += ch;
    } else {
      runs.push({ text: current, isArabic: currentIsArabic });
      current = ch;
      currentIsArabic = arabic;
    }
  }
  if (current) runs.push({ text: current, isArabic: currentIsArabic });

  // Reverse order of runs (RTL base direction), and reverse Arabic runs internally
  runs.reverse();
  return runs
    .map((r) =>
      r.isArabic ? [...r.text].reverse().join("") : r.text
    )
    .join("");
}

function processArabicText(text: string): string {
  return visualRTL(reshapeArabic(text));
}

// ─── PDF Generation ──────────────────────────────────────────────

const FONT_BASE_URL = `${Deno.env.get("SUPABASE_URL")!}/storage/v1/object/public/waqf-assets/fonts`;

// Module-level font cache to avoid re-fetching on every invoice
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

async function fetchFont(name: string): Promise<Uint8Array> {
  const url = `${FONT_BASE_URL}/${name}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch font ${name}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
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

interface WaqfSettings {
  waqf_name: string;
  waqf_deed_number: string;
  waqf_court: string;
  waqf_admin: string;
  vat_registration_number: string;
}

async function fetchWaqfSettings(adminClient: ReturnType<typeof createClient>): Promise<WaqfSettings> {
  const keys = ['waqf_name', 'waqf_deed_number', 'waqf_court', 'waqf_admin', 'vat_registration_number'];
  const { data } = await adminClient
    .from('app_settings')
    .select('key, value')
    .in('key', keys);

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  return {
    waqf_name: map.waqf_name || 'غير محدد',
    waqf_deed_number: map.waqf_deed_number || 'غير محدد',
    waqf_court: map.waqf_court || 'غير محدد',
    waqf_admin: map.waqf_admin || 'غير محدد',
    vat_registration_number: map.vat_registration_number || '',
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

  const rows: [string, string][] = [
    ["رقم الفاتورة", invNum],
    ["النوع", TYPE_AR[invoice.invoice_type] || invoice.invoice_type],
  ];

  // VAT conditional rows
  if (isVatInvoice) {
    const amountExVat = invoice.amount_excluding_vat ?? (invoice.amount - invoice.vat_amount);
    rows.push(["المبلغ قبل الضريبة (ر.س)", amountExVat.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
    rows.push([`ضريبة القيمة المضافة (${invoice.vat_rate}%)`, invoice.vat_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
    rows.push(["الإجمالي شاملاً الضريبة (ر.س)", invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
  } else {
    rows.push(["المبلغ (ر.س)", invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })]);
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

    // Use getUser for real-time session validation (prevents revoked token usage)
    const { data: { user: authUser }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client only after successful authentication
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const userId = authUser.id;

    // Rate limiting: 10 requests per minute per user
    const { data: rateLimited } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: `pdf_gen_${userId}`,
      p_limit: 10,
      p_window_seconds: 60,
    });
    if (rateLimited === true) {
      return new Response(JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات. حاول بعد دقيقة." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "accountant"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_ids } = await req.json();

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
      .from("invoices")
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
        if (invoice.file_path) {
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

        const fileName = `${invoice.invoice_number || invoice.id}.pdf`;
        const storagePath = `generated/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("invoices")
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { error: updateError } = await supabaseAdmin
          .from("invoices")
          .update({ file_path: storagePath, file_name: fileName })
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
