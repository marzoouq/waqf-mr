/**
 * Official document marks: reference number, dual issue date and verification QR.
 * يُطبَّق مركزيًا من finalizePdf على كل التقارير المنزّلة.
 */
import type jsPDF from 'jspdf';
import { reshapeArabic as rs } from './arabicReshaper';
import { formatHijriGregorian } from '@/utils/format/hijriDate';
import {
  docTypeFromFilename, getDocumentRegistrar, sha256Hex, verifyDocumentUrl, type IssuedDocumentRef,
} from './officialRegistry';

const MARGIN = 18;

export const drawOfficialMarks = async (
  doc: jsPDF, fontFamily: string, ref: IssuedDocumentRef, origin: string,
): Promise<void> => {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.width;
  const dates = formatHijriGregorian(ref.issuedAt.slice(0, 10));
  const line = `رقم الوثيقة: ${ref.docNumber}   |   تاريخ الإصدار: ${dates.hijri} — ${dates.gregorian}`;

  let qr: string | null = null;
  try {
    const QR = await import('qrcode');
    qr = await QR.toDataURL(verifyDocumentUrl(origin, ref.verificationCode), { margin: 1, width: 200 });
  } catch {
    qr = null; // تصدر الوثيقة برقمها المرجعي دون QR
  }

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.height;
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(rs(line), pageW / 2, pageH - 20.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // QR في ترويسة الصفحة الأولى (الجهة المقابلة للشعار)
  if (qr) {
    doc.setPage(1);
    doc.addImage(qr, 'PNG', MARGIN, 12, 18, 18);
    doc.setFontSize(6);
    doc.setFont(fontFamily, 'normal');
    doc.text(rs('امسح للتحقق'), MARGIN + 9, 32, { align: 'center' });
  }
};

/** يسجّل الوثيقة ويضيف علاماتها الرسمية. لا يرمي أبدًا — التنزيل لا يتوقف. */
export const applyOfficialMarks = async (
  doc: jsPDF, fontFamily: string, filename: string, fiscalYearId?: string | null,
): Promise<IssuedDocumentRef | null> => {
  const registrar = getDocumentRegistrar();
  if (!registrar || typeof window === 'undefined') return null;
  try {
    const contentHash = await sha256Hex(doc.output('arraybuffer'));
    const ref = await registrar({
      docType: docTypeFromFilename(filename), contentHash, pageCount: doc.getNumberOfPages(), fiscalYearId,
    });
    if (ref) await drawOfficialMarks(doc, fontFamily, ref, window.location.origin);
    return ref;
  } catch {
    return null;
  }
};
