// ═══════════════════════════════════════════════════════════════════════════════
// pdf-renderer.ts — توليد PDF لسند صرف داخلي بالعربية (Amiri RTL)
// ═══════════════════════════════════════════════════════════════════════════════

import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import { processArabicText } from "../_shared/arabic-reshaper.ts";

const FONT_BASE_URL = `${Deno.env.get("SUPABASE_URL")!}/storage/v1/object/public/waqf-assets/fonts`;

let cachedFonts: { regular: Uint8Array; bold: Uint8Array } | null = null;

const PAYMENT_AR: Record<string, string> = {
  cash: "نقدي",
  bank_transfer: "تحويل بنكي",
  cheque: "شيك",
  other: "أخرى",
};

export interface VoucherData {
  voucher_number: string;
  recipient_name: string;
  recipient_id_number: string | null;
  recipient_phone: string | null;
  amount: number;
  payment_method: string;
  transfer_reference: string | null;
  work_description: string;
  signature_data: string | null;
  approved_at: string | null;
  created_at: string;
}

async function fetchFont(name: string): Promise<Uint8Array> {
  const res = await fetch(`${FONT_BASE_URL}/${name}`);
  if (!res.ok) throw new Error(`Failed to fetch font ${name}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function getFonts() {
  if (!cachedFonts) {
    const [regular, bold] = await Promise.all([
      fetchFont("Amiri-Regular.ttf"),
      fetchFont("Amiri-Bold.ttf"),
    ]);
    cachedFonts = { regular, bold };
  }
  return cachedFonts;
}

function fmtAmount(n: number): string {
  // أرقام لاتينية حتى لا تخرج عن مجموعة الخط الفرعية
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}/${m}/${y}`;
}

export async function renderVoucherPdf(v: VoucherData): Promise<Uint8Array> {
  const fonts = await getFonts();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });

  const page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const ink = rgb(0.07, 0.07, 0.1);
  const muted = rgb(0.45, 0.45, 0.5);
  const accent = rgb(0.15, 0.35, 0.6);

  // helper: تنظيف نص من أي محرف لا يدعمه الخط (يسبب NaN عند قياس العرض)
  // نُبقي فقط ASCII المطبوع + كتلة العربية + أشكال العرض العربية + المسافات
  const sanitize = (s: string) =>
    (s || "")
      .replace(/[\u2010-\u2015]/g, "-") // em/en dash → ASCII -
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, "");
  const safeWidth = (font: typeof regular, text: string, size: number): number => {
    try {
      const w = font.widthOfTextAtSize(text, size);
      return Number.isFinite(w) ? w : text.length * size * 0.5;
    } catch {
      return text.length * size * 0.5;
    }
  };

  // helper: نص عربي RTL محاذي يميناً
  const drawAr = (text: string, x: number, y: number, size: number, font = regular, color = ink) => {
    const reshaped = sanitize(processArabicText(sanitize(text)));
    if (!reshaped) return;
    const w = safeWidth(font, reshaped, size);
    page.drawText(reshaped, { x: x - w, y, size, font, color });
  };
  const drawArLeft = (text: string, x: number, y: number, size: number, font = regular, color = ink) => {
    const reshaped = sanitize(processArabicText(sanitize(text)));
    if (!reshaped) return;
    page.drawText(reshaped, { x, y, size, font, color });
  };

  // العنوان
  drawAr("سند صرف داخلي", width - 40, height - 60, 22, bold, accent);
  drawAr(`رقم: ${v.voucher_number}`, width - 40, height - 85, 12, regular, muted);
  drawAr(`التاريخ: ${fmtDate(v.approved_at || v.created_at)}`, width - 40, height - 102, 12, regular, muted);

  // خط فاصل
  page.drawLine({
    start: { x: 40, y: height - 115 },
    end: { x: width - 40, y: height - 115 },
    thickness: 1, color: accent,
  });

  // بيانات المستلم
  let y = height - 145;
  drawAr("بيانات المستلم", width - 40, y, 14, bold);
  y -= 22;
  drawAr(`الاسم: ${v.recipient_name}`, width - 40, y, 11);
  y -= 18;
  if (v.recipient_id_number) {
    drawAr(`رقم الهوية: ${v.recipient_id_number}`, width - 40, y, 11);
    y -= 18;
  }
  if (v.recipient_phone) {
    drawAr(`الجوال: ${v.recipient_phone}`, width - 40, y, 11);
    y -= 18;
  }

  // بيانات الصرف
  y -= 15;
  drawAr("بيانات الصرف", width - 40, y, 14, bold);
  y -= 22;
  drawAr(`المبلغ: ${fmtAmount(v.amount)} ر.س`, width - 40, y, 13, bold);
  y -= 18;
  drawAr(`طريقة الدفع: ${PAYMENT_AR[v.payment_method] || v.payment_method}`, width - 40, y, 11);
  y -= 18;
  if (v.transfer_reference) {
    drawAr(`المرجع: ${v.transfer_reference}`, width - 40, y, 11);
    y -= 18;
  }

  // الأعمال المنفذة
  y -= 15;
  drawAr("الأعمال المنفذة", width - 40, y, 14, bold);
  y -= 22;
  const lines = wrapArabic(v.work_description, 70);
  for (const line of lines) {
    drawAr(line, width - 40, y, 11);
    y -= 16;
    if (y < 220) break;
  }

  // التوقيع (إن وُجد)
  y = 200;
  drawAr("توقيع المستلم:", width - 40, y, 11, bold);
  if (v.signature_data?.startsWith("data:image/")) {
    try {
      const b64 = v.signature_data.split(",")[1];
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const img = v.signature_data.includes("image/png")
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);
      const dims = img.scale(0.3);
      page.drawImage(img, { x: width - 200, y: y - 60, width: Math.min(dims.width, 160), height: Math.min(dims.height, 50) });
    } catch { /* skip on error */ }
  }
  page.drawLine({ start: { x: width - 220, y: y - 70 }, end: { x: width - 40, y: y - 70 }, thickness: 0.5, color: muted });

  drawAr("اعتماد الناظر:", 200, y, 11, bold);
  page.drawLine({ start: { x: 40, y: y - 70 }, end: { x: 220, y: y - 70 }, thickness: 0.5, color: muted });

  // تذييل قانوني إلزامي
  page.drawRectangle({ x: 40, y: 40, width: width - 80, height: 36, color: rgb(0.97, 0.95, 0.88) });
  drawAr(
    "سند صرف داخلي — ليس فاتورة ضريبية ولا يصلح لاسترداد ضريبة القيمة المضافة",
    width - 50, 55, 10, bold, rgb(0.55, 0.35, 0.05)
  );

  return pdf.save();
}

function wrapArabic(text: string, maxChars: number): string[] {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}
