import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { fmt } from '@/utils/format/format';

export const generateBeneficiaryStatementPDF = async (
  beneficiaryName: string,
  sharePercentage: number,
  shareAmount: number,
  fiscalYear: string,
  waqfInfo?: PdfWaqfInfo,
) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('كشف حساب المستفيد'), 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`السنة المالية: ${fiscalYear}`), 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [reshapeRow(['البيان', 'القيمة'])],
    body: [
      reshapeRow(['اسم المستفيد', beneficiaryName]),
      reshapeRow(['نسبة الحصة', `${sharePercentage}%`]),
      reshapeRow(['مبلغ الحصة', `${fmt(shareAmount)} ر.س`]),
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  finalizePdf(doc, fontFamily, `statement-${beneficiaryName}-${fiscalYear}.pdf`, waqfInfo, { skipHeaders: true });
};
