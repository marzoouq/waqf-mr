// ═══════════════════════════════════════════════════════════════════════════════
// pdf-renderer.ts — توليد PDF لسند صرف داخلي بالعربية (Amiri RTL)
// ═══════════════════════════════════════════════════════════════════════════════

import { jsPDF } from "npm:jspdf@3.0.4";
import { processArabicText } from "../_shared/arabic-reshaper.ts";

const FONT_BASE_URL = `${Deno.env.get("SUPABASE_URL")!}/storage/v1/object/public/waqf-assets/fonts`;

let cachedFonts: { regular: Uint8Array; bold: Uint8Array } | null = null;

type FontWeight = "normal" | "bold";
type Rgb = [number, number, number];

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
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.addFileToVFS("Amiri-Regular.ttf", toBase64(fonts.regular));
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
  doc.addFileToVFS("Amiri-Bold.ttf", toBase64(fonts.bold));
  doc.addFont("Amiri-Bold.ttf", "Amiri", "bold", "Identity-H");
  doc.setLanguage("ar");

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const ink: Rgb = [18, 18, 26];
  const muted: Rgb = [115, 115, 128];
  const accent: Rgb = [38, 89, 153];

  // helper: تنظيف نص من أي محرف لا يدعمه الخط (يسبب NaN عند قياس العرض)
  // نُبقي فقط ASCII المطبوع + كتلة العربية + أشكال العرض العربية + المسافات
  const sanitize = (s: string) =>
    (s || "")
      .replace(/[\u2010-\u2015]/g, "-") // em/en dash → ASCII -
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, "");
  // helper: نص عربي RTL محاذي يميناً
  const drawAr = (text: string, x: number, y: number, size: number, weight: FontWeight = "normal", color = ink) => {
    const reshaped = sanitize(processArabicText(sanitize(text)));
    if (!reshaped) return;
    doc.setFont("Amiri", weight);
    doc.setFontSize(size);
    setColor(doc, color);
    doc.text(reshaped, x, y, { align: "right", isInputVisual: true });
  };

  // العنوان
  drawAr("سند صرف داخلي", width - 40, height - 60, 22, "bold", accent);
  drawAr(`رقم: ${v.voucher_number}`, width - 40, height - 85, 12, "normal", muted);
  drawAr(`التاريخ: ${fmtDate(v.approved_at || v.created_at)}`, width - 40, height - 102, 12, "normal", muted);

  // خط فاصل
  drawLine(doc, 40, height - 115, width - 40, height - 115, accent, 1);

  // بيانات المستلم
  let y = height - 145;
  drawAr("بيانات المستلم", width - 40, y, 14, "bold");
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
  drawAr("بيانات الصرف", width - 40, y, 14, "bold");
  y -= 22;
  drawAr(`المبلغ: ${fmtAmount(v.amount)} ر.س`, width - 40, y, 13, "bold");
  y -= 18;
  drawAr(`طريقة الدفع: ${PAYMENT_AR[v.payment_method] || v.payment_method}`, width - 40, y, 11);
  y -= 18;
  if (v.transfer_reference) {
    drawAr(`المرجع: ${v.transfer_reference}`, width - 40, y, 11);
    y -= 18;
  }

  // الأعمال المنفذة
  y -= 15;
  drawAr("الأعمال المنفذة", width - 40, y, 14, "bold");
  y -= 22;
  const lines = wrapArabic(v.work_description, 70);
  for (const line of lines) {
    drawAr(line, width - 40, y, 11);
    y -= 16;
    if (y < 220) break;
  }

  // التوقيع (إن وُجد)
  y = 200;
  drawAr("توقيع المستلم:", width - 40, y, 11, "bold");
  if (v.signature_data?.startsWith("data:image/")) {
    try {
      const b64 = v.signature_data.split(",")[1];
      const imageType = v.signature_data.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(b64, imageType, width - 200, y - 60, 160, 50, undefined, "FAST");
    } catch { /* skip on error */ }
  }
  drawLine(doc, width - 220, y - 70, width - 40, y - 70, muted, 0.5);

  drawAr("اعتماد الناظر:", 200, y, 11, "bold");
  drawLine(doc, 40, y - 70, 220, y - 70, muted, 0.5);

  // تذييل قانوني إلزامي
  setFill(doc, [247, 242, 224]);
  doc.rect(40, 40, width - 80, 36, "F");
  drawAr(
    "سند صرف داخلي — ليس فاتورة ضريبية ولا يصلح لاسترداد ضريبة القيمة المضافة",
    width - 50, 62, 10, "bold", [140, 89, 13]
  );

  return new Uint8Array(doc.output("arraybuffer"));
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
