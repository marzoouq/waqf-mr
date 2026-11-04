// ═══════════════════════════════════════════════════════════════════════════════
// pdf-renderer.ts — توليد PDF لسند صرف داخلي بالعربية (Amiri RTL)
// ═══════════════════════════════════════════════════════════════════════════════

import { jsPDF } from "npm:jspdf@3.0.4";
import { amountToArabicWords } from "../_shared/arabicNumberWords.ts";
import { formatHijriGregorian } from "../_shared/hijriDate.ts";

// مصادر الخط بالترتيب: الحزمة ثم الموقع المنشور (الحزمة ترفض نوع ملفات ttf)
export const FONT_SOURCES = [
  `${Deno.env.get("SUPABASE_URL") ?? ""}/storage/v1/object/public/waqf-assets/fonts`,
  "https://waqf-wise.net/fonts",
  "https://waqf-wise-net.lovable.app/fonts",
];

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
  const failures: string[] = [];
  for (const base of FONT_SOURCES) {
    try {
      const res = await fetch(`${base}/${name}`);
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
      failures.push(`${base}: ${res.status}`);
      await res.body?.cancel();
    } catch (e) {
      failures.push(`${base}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`Failed to fetch font ${name} (${failures.join("; ")})`);
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

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary);
}

function setColor(doc: jsPDF, color: Rgb): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setFill(doc: jsPDF, color: Rgb): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

function drawLine(doc: jsPDF, pageHeight: number, x1: number, y1: number, x2: number, y2: number, color: Rgb, width: number): void {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(width);
  doc.line(x1, pageHeight - y1, x2, pageHeight - y2);
}

export interface WaqfHeader {
  name: string;
  deed_number?: string | null;
  court?: string | null;
  vat_number?: string | null;
  logo_url?: string | null;
}

export async function renderVoucherPdf(v: VoucherData, waqf: WaqfHeader = { name: "" }): Promise<Uint8Array> {
  const fonts = await getFonts();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.addFileToVFS("Amiri-Regular.ttf", toBase64(fonts.regular));
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
  doc.addFileToVFS("Amiri-Bold.ttf", toBase64(fonts.bold));
  doc.addFont("Amiri-Bold.ttf", "Amiri", "bold", "Identity-H");
  doc.setLanguage("ar");

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const R = W - 50; // الهامش الأيمن
  const L = 50;
  const ink: Rgb = [18, 18, 26];
  const muted: Rgb = [105, 105, 118];
  const accent: Rgb = [22, 78, 130];
  const gold: Rgb = [176, 141, 60];

  const sanitize = (s: string) =>
    (s || "")
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, "");
  // نص بإحداثيات من أعلى الصفحة
  const text = (t: string, x: number, y: number, size: number, weight: FontWeight = "normal", color = ink, align: "right" | "left" | "center" = "right") => {
    const s = sanitize(t);
    if (!s) return;
    doc.setFont("Amiri", weight);
    doc.setFontSize(size);
    setColor(doc, color);
    doc.text(s, x, y, { align });
  };
  // تسمية ثم قيمة منفصلتان لتفادي انعكاس الترتيب في النص المختلط
  const labelValue = (label: string, value: string, x: number, y: number, size = 11) => {
    text(label, x, y, size, "bold", muted);
    doc.setFont("Amiri", "bold");
    doc.setFontSize(size);
    const lw = doc.getTextWidth(sanitize(label));
    text(value, x - lw - 6, y, size, "normal", ink);
  };

  drawBorder(doc, W, H, accent, gold);

  // ── الترويسة: الشعار + بيانات الوقف ──
  let headerBottom = 120;
  if (waqf.logo_url) {
    try {
      const res = await fetch(waqf.logo_url);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        const type = (res.headers.get("content-type") || "").includes("png") ? "PNG" : "JPEG";
        doc.addImage(toBase64(bytes), type, L, 40, 64, 64, undefined, "FAST");
      }
    } catch { /* السند يستمر دون شعار */ }
  }
  text(waqf.name || "وقف مرزوق بن علي الثبيتي", R, 62, 17, "bold", accent);
  let hy = 82;
  if (waqf.deed_number) { labelValue("صك الوقف رقم:", waqf.deed_number, R, hy, 10); hy += 15; }
  if (waqf.court) { labelValue("جهة التوثيق:", waqf.court, R, hy, 10); hy += 15; }
  if (waqf.vat_number) { labelValue("الرقم الضريبي:", waqf.vat_number, R, hy, 10); hy += 15; }
  headerBottom = Math.max(headerBottom, hy + 4);
  drawLine(doc, H, L, H - headerBottom, R, H - headerBottom, gold, 1.2);

  // ── عنوان السند ──
  let y = headerBottom + 34;
  text("سند صرف", W / 2, y, 22, "bold", accent, "center");
  y += 26;
  const issued = (v.approved_at || v.created_at || "").slice(0, 10);
  const dates = formatHijriGregorian(issued);
  labelValue("رقم السند:", v.voucher_number, R, y);
  text(`${dates.hijri}  -  ${dates.gregorian} م`, L, y, 11, "normal", ink, "left");
  text("التاريخ:", L + 190, y, 11, "bold", muted, "left");
  y += 18;

  // ── جدول البيانات ──
  const rows: Array<[string, string]> = [
    ["صُرف إلى المكرم", v.recipient_name],
  ];
  if (v.recipient_id_number) rows.push(["رقم الهوية", v.recipient_id_number]);
  if (v.recipient_phone) rows.push(["الجوال", v.recipient_phone]);
  rows.push(["مبلغاً وقدره", `${fmtAmount(v.amount)} ريال سعودي`]);
  rows.push(["المبلغ كتابةً", amountToArabicWords(v.amount)]);
  rows.push(["طريقة الصرف", PAYMENT_AR[v.payment_method] || v.payment_method]);
  if (v.transfer_reference) rows.push(["رقم المرجع", v.transfer_reference]);

  const labelW = 120;
  const rowH = 26;
  doc.setLineWidth(0.5);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  for (const [label, value] of rows) {
    setFill(doc, [244, 239, 226]);
    doc.rect(R - labelW, y, labelW, rowH, "FD");
    doc.rect(L, y, R - labelW - L, rowH, "S");
    text(label, R - 8, y + 17, 11, "bold", accent);
    const lines = wrapArabic(value, 62);
    text(lines[0] ?? "", R - labelW - 8, y + 17, 11, "normal", ink);
    y += rowH;
  }

  // ── وذلك عن: الأعمال المنفذة ──
  const work = wrapArabic(v.work_description, 80).slice(0, 6);
  const workH = Math.max(rowH, 18 + work.length * 16);
  setFill(doc, [244, 239, 226]);
  doc.rect(R - labelW, y, labelW, workH, "FD");
  doc.rect(L, y, R - labelW - L, workH, "S");
  text("وذلك عن", R - 8, y + 17, 11, "bold", accent);
  work.forEach((line, i) => text(line, R - labelW - 8, y + 17 + i * 16, 11));
  y += workH + 50;

  // ── التوقيعات والختم ──
  const sigY = Math.min(y, H - 230);
  text("توقيع المستلم", R - 70, sigY, 12, "bold", ink, "center");
  text("المحاسب", W / 2, sigY, 12, "bold", ink, "center");
  text("اعتماد ناظر الوقف", L + 80, sigY, 12, "bold", ink, "center");
  if (v.signature_data?.startsWith("data:image/")) {
    try {
      const b64 = v.signature_data.split(",")[1];
      const imageType = v.signature_data.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(b64, imageType, R - 140, sigY + 10, 140, 45, undefined, "FAST");
    } catch { /* skip on error */ }
  }
  doc.setLineDashPattern([2, 2], 0);
  doc.setDrawColor(muted[0], muted[1], muted[2]);
  doc.line(R - 140, sigY + 62, R, sigY + 62);
  doc.line(W / 2 - 60, sigY + 62, W / 2 + 60, sigY + 62);
  doc.line(L, sigY + 62, L + 160, sigY + 62);
  doc.setLineDashPattern([], 0);
  drawStamp(doc, L + 80, sigY + 38, 46, accent, text, waqf.name, v.voucher_number, dates.gregorian);

  // ── تذييل ──
  setFill(doc, [247, 242, 224]);
  doc.rect(L, H - 86, R - L, 30, "F");
  text("سند صرف داخلي - ليس فاتورة ضريبية ولا يصلح لاسترداد ضريبة القيمة المضافة", W / 2, H - 66, 10, "bold", [140, 89, 13], "center");

  return new Uint8Array(doc.output("arraybuffer"));
}

type TextFn = (t: string, x: number, y: number, size: number, weight?: FontWeight, color?: Rgb, align?: "right" | "left" | "center") => void;

// إطار رسمي مزدوج للصفحة
function drawBorder(doc: jsPDF, W: number, H: number, outer: Rgb, inner: Rgb): void {
  doc.setDrawColor(outer[0], outer[1], outer[2]);
  doc.setLineWidth(1.6);
  doc.rect(24, 24, W - 48, H - 48, "S");
  doc.setDrawColor(inner[0], inner[1], inner[2]);
  doc.setLineWidth(0.6);
  doc.rect(30, 30, W - 60, H - 60, "S");
}

// ختم الوقف الرسمي (رسم متجهي)
function drawStamp(doc: jsPDF, cx: number, cy: number, r: number, color: Rgb, text: TextFn, name: string, serial: string, date: string): void {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(2);
  doc.circle(cx, cy, r, "S");
  doc.setLineWidth(0.8);
  doc.circle(cx, cy, r - 4, "S");
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.circle(cx, cy, r - 17, "S");
  doc.setLineDashPattern([], 0);
  const n = (name || "وقف مرزوق بن علي الثبيتي").slice(0, 30);
  text(n, cx, cy - r + 14, n.length > 22 ? 7 : 8, "bold", color, "center");
  text("ختم الوقف", cx, cy + 1, 11, "bold", color, "center");
  text("ناظر الوقف", cx, cy + 12, 7, "normal", color, "center");
  text(serial, cx, cy + r - 15, 6, "normal", color, "center");
  text(date, cx, cy + r - 8, 6, "normal", color, "center");
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
