/**
 * سند قبض رسمي — ترويسة الوقف، رقم تسلسلي، تاريخ هجري/ميلادي، تفقيط، توقيع وختم، QR للتحقق.
 */
import { createPdfDocument, finalizePdf, type PdfWaqfInfo } from '@/utils/pdf/core/core';
import { reshapeArabic as rs } from '@/utils/pdf/core/arabicReshaper';
import { addPageBorder } from '@/utils/pdf/core/pdfLayout';
import { getPdfThemeColors } from '@/utils/pdf/core/themeColors';
import { amountToArabicWords } from '@/utils/format/arabicNumberWords';
import { formatHijriGregorian } from '@/utils/format/hijriDate';
import { fmt } from '@/utils/format/format';
import { drawWaqfStamp } from '@/utils/pdf/receipts/waqfStamp';

export interface ReceiptVoucherPdfData {
  receiptNumber: string;
  status: 'issued' | 'void';
  voidReason?: string | null;
  paidDate: string;
  amount: number;
  paymentMethod: string;
  tenantName: string;
  contractNumber: string;
  propertyNumber?: string | null;
  unitNumber?: string | null;
  invoiceNumber: string;
  paymentNumber: number;
  paymentCount?: number | null;
  dueDate: string;
  remaining?: number;
  verifyUrl: string;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقداً', bank_transfer: 'تحويل بنكي', cheque: 'شيك', other: 'أخرى',
};

export const receiptVoucherFilename = (receiptNumber: string) => `سند-قبض-${receiptNumber}.pdf`;

export async function generateReceiptVoucherPDF(data: ReceiptVoucherPdfData, waqfInfo?: PdfWaqfInfo): Promise<void> {
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);
  const colors = getPdfThemeColors();
  const pageW = doc.internal.pageSize.width;
  const right = pageW - 20;
  let y = startY + 4;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('سند قبض'), pageW / 2, y, { align: 'center' });
  y += 10;

  const dates = formatHijriGregorian(data.paidDate);
  doc.setFontSize(10);
  doc.setFont(fontFamily, 'normal');
  // التسمية والرقم منفصلان لتفادي انعكاس الترتيب في النص المختلط
  doc.text(rs('رقم السند:'), right, y, { align: 'right' });
  doc.text(data.receiptNumber, right - doc.getTextWidth(rs('رقم السند:')) - 2, y, { align: 'right' });
  doc.text(rs(`التاريخ: ${dates.hijri}  -  ${dates.gregorian} م`), 20, y, { align: 'left' });
  y += 10;

  // جدول البيانات
  const due = formatHijriGregorian(data.dueDate);
  const rows: Array<[string, string]> = [
    ['استلمنا من المكرم', data.tenantName],
    ['مبلغاً وقدره', `${fmt(data.amount)} ريال`],
    ['المبلغ كتابةً', amountToArabicWords(data.amount)],
    ['وذلك عن', `إيجار الدفعة رقم ${data.paymentNumber}${data.paymentCount ? ` من ${data.paymentCount}` : ''} المستحقة في ${due.gregorian} م`],
    ['رقم العقد', data.contractNumber],
    ['العقار / الوحدة', [data.propertyNumber, data.unitNumber].filter(Boolean).join(' / ') || '-'],
    ['رقم الفاتورة', data.invoiceNumber],
    ['طريقة السداد', METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod],
  ];
  if (data.remaining && data.remaining > 0) rows.push(['المتبقي على الدفعة', `${fmt(data.remaining)} ريال`]);

  const labelW = 45;
  const rowH = 10;
  doc.setDrawColor(...colors.secondary);
  doc.setLineWidth(0.3);
  for (const [label, value] of rows) {
    doc.setFillColor(248, 245, 236);
    doc.rect(right - labelW, y, labelW, rowH, 'FD');
    doc.rect(20, y, right - labelW - 20, rowH, 'S');
    doc.setFont(fontFamily, 'bold');
    doc.text(rs(label), right - 3, y + 6.5, { align: 'right' });
    doc.setFont(fontFamily, 'normal');
    const lines = doc.splitTextToSize(value, right - labelW - 26) as string[];
    doc.text(rs(lines[0] ?? ''), right - labelW - 3, y + 6.5, { align: 'right' });
    y += rowH;
  }
  y += 14;

  // التوقيع والختم
  doc.setFont(fontFamily, 'bold');
  doc.text(rs('المستلم — المحاسب'), right - 20, y, { align: 'center' });
  doc.text(rs('ناظر الوقف — التوقيع والختم'), pageW / 2 - 10, y, { align: 'center' });
  y += 18;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(right - 45, y, right, y);
  doc.line(pageW / 2 - 40, y, pageW / 2 + 20, y);
  doc.setLineDashPattern([], 0);
  drawWaqfStamp(doc, {
    cx: pageW / 2 - 10, cy: y - 9, fontFamily,
    waqfName: waqfInfo?.waqfName, serial: data.receiptNumber, dateText: data.paidDate,
  });

  // رمز QR للتحقق
  try {
    const QR = await import('qrcode');
    const qr = await QR.toDataURL(data.verifyUrl, { margin: 1, width: 240 });
    doc.addImage(qr, 'PNG', 20, y - 26, 30, 30);
    doc.setFontSize(7);
    doc.setFont(fontFamily, 'normal');
    doc.text(rs('امسح للتحقق من صحة السند'), 35, y + 8, { align: 'center' });
  } catch {
    // يستمر السند دون QR إذا تعذّر توليده
  }

  if (data.status === 'void') {
    doc.setTextColor(200, 30, 30);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(60);
    doc.text(rs('ملغى'), pageW / 2, 150, { align: 'center', angle: 30 });
    doc.setFontSize(10);
    if (data.voidReason) doc.text(rs(`سبب الإلغاء: ${data.voidReason}`), pageW / 2, y + 16, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  addPageBorder(doc);
  finalizePdf(doc, fontFamily, receiptVoucherFilename(data.receiptNumber), waqfInfo, { skipHeaders: true, skipOfficialMarks: true });
}
