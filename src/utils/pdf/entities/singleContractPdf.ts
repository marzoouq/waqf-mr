/**
 * عقد إيجار فردي رسمي — ترويسة الوقف وشعاره، بيانات العقد والأطراف، جدول الدفعات،
 * اعتماد الناظر والختم الوقفي، وتذييل بتاريخ الطباعة الهجري والميلادي (عبر finalizePdf).
 */
import {
  PdfWaqfInfo, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD, baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from '../core/core';
import { getLastAutoTableY } from '../core/pdfHelpers';
import { stampAfterContent } from '../core/approvalStamp';
import { fmt } from '@/utils/format/format';
import { formatHijriGregorian } from '@/utils/format/hijriDate';
import { singleContractFilename, type SingleContractPdfData } from '@/utils/contracts/singleContractPdfData';

// أرقام فقط داخل الخلية (التسمية تحدد التقويم) حتى لا ينعكس ترتيب النص المختلط
const dual = (d: string) => {
  if (!d) return '—';
  const x = formatHijriGregorian(d);
  return `${x.gregorian}   /   ${x.hijri.replace(/\s*هـ$/, '')}`;
};

export const generateSingleContractPDF = async (data: SingleContractPdfData, waqfInfo?: PdfWaqfInfo) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);
  const pageW = doc.internal.pageSize.width;
  const right = pageW - 18;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('عقد إيجار'), pageW / 2, startY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  // الرقم منفصل عن التسمية لتفادي انعكاس الترتيب
  const label = rs('رقم العقد');
  const numW = doc.getTextWidth(data.contractNumber);
  const total = doc.getTextWidth(label) + 3 + numW;
  doc.text(label, pageW / 2 + total / 2, startY + 13, { align: 'right' });
  doc.text(data.contractNumber, pageW / 2 - total / 2, startY + 13, { align: 'left' });

  const pageH = doc.internal.pageSize.height;
  const section = (title: string, at: number) => {
    // لا يُترك عنوان قسم وحيداً أسفل الصفحة
    let y = at;
    if (y > pageH - 70) { doc.addPage(); y = 30; }
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(12);
    doc.text(rs(title), right, y, { align: 'right' });
    return y + 3;
  };
  const kv = (rows: Array<[string, string]>, y: number, color = TABLE_HEAD_GREEN) => {
    autoTable(doc, {
      startY: y,
      body: rows.map(([k, v]) => reshapeRow([v, { content: k, styles: { fontStyle: 'bold', fillColor: [248, 245, 236], textColor: color } }])),
      theme: 'grid',
      ...baseTableStyles(fontFamily),
      columnStyles: { 1: { cellWidth: 48 } },
    });
    return getLastAutoTableY(doc, y + 20) + 9;
  };

  let y = section('أولاً: بيانات المؤجر', startY + 24);
  const lessor: Array<[string, string]> = [['المؤجر', waqfInfo?.waqfName || 'الوقف']];
  if (waqfInfo?.adminName) lessor.push(['ناظر الوقف', waqfInfo.adminName]);
  if (waqfInfo?.deedNumber) lessor.push(['الصك', waqfInfo.deedNumber]);
  y = kv(lessor, y);

  y = section('ثانياً: بيانات المستأجر', y);
  y = kv(data.tenantRows, y);

  y = section('ثالثاً: بيانات العقد', y);
  const terms: Array<[string, string]> = [
    ['العقار', data.propertyLabel],
    ...(data.unitLabel ? [['الوحدة', data.unitLabel] as [string, string]] : []),
    ['تاريخ البداية هجري / ميلادي', dual(data.startDate)],
    ['تاريخ النهاية هجري / ميلادي', dual(data.endDate)],
    ['القيمة الإيجارية السنوية', `${fmt(data.annualRent)} ر.س`],
    ...(data.paymentTypeLabel ? [['طريقة السداد', data.paymentTypeLabel] as [string, string]] : []),
    ...(data.paymentCount ? [['عدد الدفعات', String(data.paymentCount)] as [string, string]] : []),
    ...(data.paymentAmount !== null ? [['قيمة الدفعة', `${fmt(data.paymentAmount)} ر.س`] as [string, string]] : []),
    ['حالة العقد', data.statusLabel],
  ];
  if (data.notes) terms.push(['ملاحظات', data.notes]);
  y = kv(terms, y);

  if (data.payments.length > 0) {
    y = section('رابعاً: جدول الدفعات', y);
    autoTable(doc, {
      startY: y,
      head: [reshapeRow(['الحالة', 'المبلغ بالريال', 'تاريخ الاستحقاق هجري / ميلادي', 'رقم الدفعة'])],
      body: data.payments.map(p => reshapeRow([p.statusLabel, fmt(p.amount), dual(p.dueDate), String(p.number)])),
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GOLD, fontFamily),
      ...baseTableStyles(fontFamily),
    });
  }

  stampAfterContent(doc, fontFamily, waqfInfo);
  return finalizePdf(doc, fontFamily, singleContractFilename(data.contractNumber), waqfInfo, { fiscalYearId: data.fiscalYearId });
};
