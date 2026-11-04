/**
 * Official certified letter PDF (issued by the waqf overseer).
 * وثيقة معتمدة: ترويسة + تاريخ مزدوج + الموضوع والنص + توقيع وختم + رقم مرجعي وQR.
 */
import { createPdfDocument, finalizePdf, reshapeArabic as rs, type PdfWaqfInfo } from '@/utils/pdf/core/core';
import { addPageBorder } from '@/utils/pdf/core/pdfLayout';
import { drawOfficialMarks } from '@/utils/pdf/core/officialStamp';
import type { IssuedDocumentRef } from '@/utils/pdf/core/officialRegistry';
import { drawWaqfStamp } from '@/utils/pdf/receipts/waqfStamp';
import { formatHijriGregorian } from '@/utils/format/hijriDate';

export const OFFICIAL_LETTER_FILENAME = 'official_letter.pdf';

export const LETTER_TYPE_LABELS: Record<string, string> = {
  statement: 'إفادة',
  letter: 'خطاب',
  beneficiary_certificate: 'شهادة استحقاق مستفيد',
  tenant_payment_statement: 'إفادة سداد مستأجر',
};

export interface OfficialLetterPdfData {
  letterType: string;
  recipient: string;
  subject: string;
  body: string;
  status?: string;
  /** عند إعادة الطباعة: المرجع المحفوظ — لا يُسجَّل رقم جديد */
  existingRef?: IssuedDocumentRef;
}

export async function generateOfficialLetterPDF(
  data: OfficialLetterPdfData, waqfInfo?: PdfWaqfInfo,
): Promise<IssuedDocumentRef | null> {
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);
  const pageW = doc.internal.pageSize.width;
  const right = pageW - 22;
  const today = new Date().toISOString().slice(0, 10);
  const dates = formatHijriGregorian((data.existingRef?.issuedAt ?? today).slice(0, 10));

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.text(rs(LETTER_TYPE_LABELS[data.letterType] ?? 'وثيقة معتمدة'), pageW / 2, startY + 6, { align: 'center' });

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(10);
  doc.text(rs(`التاريخ: ${dates.hijri} — ${dates.gregorian}`), right, startY + 18, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont(fontFamily, 'bold');
  doc.text(rs(`إلى: ${data.recipient}`), right, startY + 30, { align: 'right' });
  doc.text(rs(`الموضوع: ${data.subject}`), right, startY + 39, { align: 'right' });

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(11);
  let y = startY + 52;
  doc.text(rs('السلام عليكم ورحمة الله وبركاته، وبعد:'), right, y, { align: 'right' });
  y += 9;
  const lines: string[] = doc.splitTextToSize(data.body, pageW - 44);
  for (const line of lines) {
    if (y > 225) { doc.addPage(); y = startY; }
    doc.text(rs(line), right, y, { align: 'right' });
    y += 7;
  }
  y = Math.max(y + 10, 200);
  if (y > 240) { doc.addPage(); y = startY + 20; }

  doc.setFont(fontFamily, 'bold');
  doc.text(rs('ناظر الوقف'), 50, y, { align: 'center' });
  doc.setFont(fontFamily, 'normal');
  doc.text(rs('التوقيع: ....................'), 50, y + 10, { align: 'center' });
  drawWaqfStamp(doc, {
    cx: pageW / 2 + 15, cy: y + 6, fontFamily, waqfName: waqfInfo?.waqfName,
    serial: data.existingRef?.docNumber ?? '—', dateText: dates.gregorian,
  });

  if (data.status === 'void') {
    doc.setTextColor(200, 30, 30);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(60);
    doc.text(rs('ملغاة'), pageW / 2, 150, { align: 'center', angle: 30 });
    doc.setTextColor(0, 0, 0);
  }

  addPageBorder(doc);
  if (data.existingRef && typeof window !== 'undefined') {
    await drawOfficialMarks(doc, fontFamily, data.existingRef, window.location.origin);
    await finalizePdf(doc, fontFamily, OFFICIAL_LETTER_FILENAME, waqfInfo, { skipOfficialMarks: true });
    return data.existingRef;
  }
  return finalizePdf(doc, fontFamily, OFFICIAL_LETTER_FILENAME, waqfInfo);
}
