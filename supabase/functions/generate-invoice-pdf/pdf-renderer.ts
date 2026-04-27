// ═══════════════════════════════════════════════════════════════════════════════
// pdf-renderer.ts — توليد PDF بالعربية (Amiri) مع QR ZATCA
// ═══════════════════════════════════════════════════════════════════════════════

import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import QRCode from "npm:qrcode@1.5.4";
import { processArabicText } from "../_shared/arabic-reshaper.ts";
import { generateZatcaQrTLV } from "../_shared/zatca-qr-tlv.ts";
import type { InvoiceData, WaqfSettings } from "./settings-fetcher.ts";

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

const FONT_BASE_URL = `${Deno.env.get("SUPABASE_URL")!}/storage/v1/object/public/waqf-assets/fonts`;

// Module-level font cache — works within the same Deno Deploy warm isolate.
// On cold starts, fonts are re-fetched (~200ms). This is acceptable and expected.
let cachedFonts: { regular: Uint8Array; bold: Uint8Array } | null = null;

async function fetchFont(name: string, retries = 3): Promise<Uint8Array> {
  const url = `${FONT_BASE_URL}/${name}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error(`Font too small (${buf.length} bytes)`);
      return buf;
    } catch (err) {
      if (attempt === retries) {
        cachedFonts = null;
        throw new Error(
          `Failed to fetch font ${name} after ${retries} attempts: ${err instanceof Error ? err.message : String(err)}`,
          { cause: err },
        );
      }
      await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }
  throw new Error(`Unreachable: fetchFont ${name}`);
}

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

export async function generateInvoicePdf(invoice: InvoiceData, waqfSettings: WaqfSettings): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

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

  const headerText = processArabicText(waqfSettings.waqf_name);
  const headerW = amiriBold.widthOfTextAtSize(headerText, 20);
  page.drawText(headerText, { x: width - margin - 15 - headerW, y: headerY + 40, size: 20, font: amiriBold, color: rgb(1, 1, 1) });

  const subText = processArabicText("نظام إدارة الوقف");
  const subW = amiri.widthOfTextAtSize(subText, 12);
  page.drawText(subText, { x: width - margin - 15 - subW, y: headerY + 15, size: 12, font: amiri, color: rgb(0.9, 0.85, 0.6) });

  // ── Waqf details (dynamic) ──
  let y = headerY - 30;
  const detailLines = [
    `رقم الصك: ${waqfSettings.waqf_deed_number}`,
    `المحكمة: ${waqfSettings.waqf_court}`,
    `الناظر: ${waqfSettings.waqf_admin}`,
  ];
  if (waqfSettings.vat_registration_number) detailLines.push(`الرقم الضريبي: ${waqfSettings.vat_registration_number}`);
  if (waqfSettings.commercial_registration_number) detailLines.push(`السجل التجاري: ${waqfSettings.commercial_registration_number}`);
  if (waqfSettings.business_address) detailLines.push(`العنوان: ${waqfSettings.business_address}`);
  if (waqfSettings.waqf_bank_iban) {
    detailLines.push(`IBAN: ${waqfSettings.waqf_bank_iban}${waqfSettings.waqf_bank_name ? ` (${waqfSettings.waqf_bank_name})` : ""}`);
  }

  for (const line of detailLines) {
    const shaped = processArabicText(line);
    const tw = amiri.widthOfTextAtSize(shaped, 11);
    page.drawText(shaped, { x: width - margin - 15 - tw, y, size: 11, font: amiri, color: medGray });
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

  const fmtNum = (n: number) => n.toLocaleString("ar-SA", { minimumFractionDigits: 2 });
  const typeLabel = TYPE_AR[invoice.invoice_type] || (invoice.invoice_type ? invoice.invoice_type : "إيجار");

  const rows: [string, string][] = [
    ["رقم الفاتورة", invNum],
    ["النوع", typeLabel],
  ];

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

    const shapedLabel = processArabicText(label);
    const labelW = amiri.widthOfTextAtSize(shapedLabel, 11);
    page.drawText(shapedLabel, { x: colLabelX - 10 - labelW, y: y - 12, size: 11, font: amiri, color: black });

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
      let tlvBase64 = "";
      const zatcaXml = invRecord.zatca_xml ? String(invRecord.zatca_xml) : "";
      if (zatcaXml) {
        const qrMatch = zatcaXml.match(
          /<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<cbc:EmbeddedDocumentBinaryObject[^>]*>([^<]+)<\/cbc:EmbeddedDocumentBinaryObject>/,
        );
        if (qrMatch && qrMatch[1] && !qrMatch[1].includes("<!--")) {
          tlvBase64 = qrMatch[1].trim();
        }
      }
      if (!tlvBase64) {
        tlvBase64 = generateZatcaQrTLV(
          waqfSettings.waqf_name,
          waqfSettings.vat_registration_number,
          new Date().toISOString(),
          invoice.amount,
          invoice.vat_amount,
        );
      }

      const qrDataUrl: string = await QRCode.toDataURL(tlvBase64, {
        width: 150,
        margin: 1,
        errorCorrectionLevel: "M",
      });
      const base64Data = qrDataUrl.split(",")[1];
      const qrBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);

      const qrSize = 80;
      const qrX = (width - qrSize) / 2;
      page.drawImage(qrImage, { x: qrX, y: y - qrSize - 5, width: qrSize, height: qrSize });
      y -= qrSize + 15;
    } catch (qrErr) {
      console.error("QR generation failed:", qrErr instanceof Error ? qrErr.message : String(qrErr));
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
