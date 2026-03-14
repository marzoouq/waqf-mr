import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PdfWaqfInfo, loadArabicFont, addFooter, loadLogoBase64,
  TABLE_HEAD_GREEN,
  baseTableStyles, headStyles,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { supabase } from '@/integrations/supabase/client';
import { generateZatcaQrTLV, generateQrDataUrl } from '@/utils/zatcaQr';

export type InvoiceTemplate = 'classic' | 'tax_professional' | 'compact';

export interface PaymentInvoicePdfData {
  id: string;
  invoiceNumber: string;
  contractNumber: string;
  tenantName: string;
  propertyNumber: string;
  paymentNumber: number;
  totalPayments: number;
  amount: number;
  dueDate: string;
  status: string;
  paidDate?: string | null;
  paidAmount?: number | null;
  notes?: string | null;
  vatRate?: number;
  vatAmount?: number;
  tenantVatNumber?: string;
  tenantAddress?: string;
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'paid': return 'مسددة';
    case 'pending': return 'قيد الانتظار';
    case 'overdue': return 'متأخرة';
    case 'partially_paid': return 'مسددة جزئياً';
    default: return s;
  }
};

// INV-CRIT-1: sanitize مسار الملف لمنع path traversal
const sanitizePath = (name: string) => name.replace(/[\/\\\.]+/g, '_').replace(/\.\./g, '_');

/* ─── دوال رسم مشتركة ─── */

// رسم بيانات البائع
const renderSellerInfo = (
  doc: jsPDF, fontFamily: string, waqfInfo: PdfWaqfInfo | undefined,
  startY: number, pageW: number, compact = false,
) => {
  if (!waqfInfo?.waqfName) return startY;
  const margin = 18;
  let y = startY;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(compact ? 10 : 12);
  doc.text(waqfInfo.waqfName, pageW - margin, y, { align: 'right' });
  y += compact ? 5 : 7;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(compact ? 7 : 8);

  if (waqfInfo.vatNumber) {
    doc.text(`الرقم الضريبي: ${waqfInfo.vatNumber}`, pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }
  if (waqfInfo.commercialReg) {
    doc.text(`السجل التجاري: ${waqfInfo.commercialReg}`, pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }
  if (waqfInfo.address) {
    doc.text(`العنوان: ${waqfInfo.address}`, pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }

  return y;
};

// رسم بيانات المشتري
const renderBuyerInfo = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number, pageW: number, compact = false,
) => {
  const margin = 18;
  let y = startY;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(compact ? 8 : 9);
  doc.text('بيانات العميل', pageW - margin, y, { align: 'right' });
  y += compact ? 4 : 5;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(compact ? 7 : 8);
  doc.text(`الاسم: ${invoice.tenantName}`, pageW - margin, y, { align: 'right' });
  y += compact ? 4 : 5;

  if (invoice.tenantVatNumber) {
    doc.text(`الرقم الضريبي: ${invoice.tenantVatNumber}`, pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }
  if (invoice.tenantAddress) {
    doc.text(`العنوان: ${invoice.tenantAddress}`, pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }

  return y;
};

// رسم معلومات الفاتورة (رقم + تاريخ + عقد + عقار)
const renderInvoiceMeta = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number, pageW: number, compact = false,
) => {
  const margin = 18;
  let y = startY;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(compact ? 7 : 8);

  const leftItems = [
    [`رقم الفاتورة: ${invoice.invoiceNumber}`],
    [`التاريخ: ${invoice.dueDate}`],
    [`رقم العقد: ${invoice.contractNumber}`],
    [`العقار: ${invoice.propertyNumber}`],
    [`الدفعة: ${invoice.paymentNumber} من ${invoice.totalPayments}`],
  ];

  for (const [text] of leftItems) {
    doc.text(text, margin, y, { align: 'left' });
    y += compact ? 4 : 5;
  }

  return y;
};

// رسم جدول البنود (8 أعمدة)
const renderLineItemsTable = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number,
) => {
  const vatRate = invoice.vatRate ?? 0;
  const vatAmount = invoice.vatAmount ?? 0;
  const amountExVat = invoice.amount - vatAmount;

  autoTable(doc, {
    startY,
    head: [['#', 'الوصف', 'الكمية', 'سعر الوحدة', 'المجموع بدون ضريبة', 'نسبة الضريبة', 'قيمة الضريبة', 'الإجمالي']],
    body: [[
      '1',
      `إيجار — دفعة ${invoice.paymentNumber}`,
      '1',
      `${amountExVat.toLocaleString()}`,
      `${amountExVat.toLocaleString()}`,
      `${vatRate}%`,
      `${vatAmount.toLocaleString()}`,
      `${invoice.amount.toLocaleString()}`,
    ]],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
    styles: {
      halign: 'center' as const,
      font: fontFamily,
      fontStyle: 'normal' as const,
      cellPadding: 3,
      fontSize: 8,
    },
    headStyles: {
      fillColor: TABLE_HEAD_GREEN,
      font: fontFamily,
      fontStyle: 'bold' as const,
      fontSize: 7,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 45, halign: 'right' as const },
    },
  });
};

// رسم ملخص الضريبة
const renderVatSummary = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number, pageW: number,
) => {
  const margin = 18;
  const vatAmount = invoice.vatAmount ?? 0;
  const amountExVat = invoice.amount - vatAmount;
  let y = startY;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);

  // خط فاصل
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2, y, pageW - margin, y);
  y += 6;

  const summaryItems = [
    ['الإجمالي قبل الضريبة:', `${amountExVat.toLocaleString()} ر.س`],
    [`ضريبة القيمة المضافة (${invoice.vatRate ?? 0}%):`, `${vatAmount.toLocaleString()} ر.س`],
  ];

  for (const [label, value] of summaryItems) {
    doc.text(label, pageW - margin - 60, y, { align: 'right' });
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += 6;
  }

  // الإجمالي بخط عريض
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(11);
  doc.text('الإجمالي شاملاً الضريبة:', pageW - margin - 60, y, { align: 'right' });
  doc.text(`${invoice.amount.toLocaleString()} ر.س`, pageW - margin, y, { align: 'right' });
  y += 4;

  return y;
};

// رسم بيانات الدفع (البنك)
const renderBankDetails = (
  doc: jsPDF, fontFamily: string, waqfInfo: PdfWaqfInfo | undefined,
  startY: number, pageW: number,
) => {
  if (!waqfInfo?.bankName && !waqfInfo?.bankIBAN) return startY;
  const margin = 18;
  let y = startY + 4;

  // خط فاصل
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(9);
  doc.text('بيانات الدفع', pageW - margin, y, { align: 'right' });
  y += 5;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);

  if (waqfInfo?.bankName) {
    doc.text(`البنك: ${waqfInfo.bankName}`, pageW - margin, y, { align: 'right' });
    y += 5;
  }
  if (waqfInfo?.bankAccount) {
    doc.text(`رقم الحساب: ${waqfInfo.bankAccount}`, pageW - margin, y, { align: 'right' });
    y += 5;
  }
  if (waqfInfo?.bankIBAN) {
    doc.text(`IBAN: ${waqfInfo.bankIBAN}`, margin, y, { align: 'left' });
    y += 5;
  }

  return y;
};

// رسم QR Code — يظهر دائماً حتى لو VAT = 0
const renderQrCode = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  waqfInfo: PdfWaqfInfo | undefined, x: number, y: number, size: number,
) => {
  const vatAmount = invoice.vatAmount ?? 0;

  // توليد TLV — يشمل بيانات البائع والمبلغ حتى لو الضريبة صفر
  const tlvBase64 = generateZatcaQrTLV({
    sellerName: waqfInfo?.waqfName || '',
    vatNumber: waqfInfo?.vatNumber || '',
    timestamp: (invoice.paidDate || invoice.dueDate || new Date().toISOString()),
    totalWithVat: invoice.amount,
    vatAmount: vatAmount,
  });

  const qrDataUrl = await generateQrDataUrl(tlvBase64);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', x, y, size, size);
  } else {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`TLV: ${tlvBase64.substring(0, 60)}...`, x + size / 2, y + size / 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
};

/* ─── القالب الكلاسيكي (الحالي مُحسَّن) ─── */
const renderClassic = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  // ترويسة البائع بسيطة
  let y = 15;
  y = renderSellerInfo(doc, fontFamily, waqfInfo, y, pageW);
  y += 2;

  // خط ذهبي فاصل
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // عنوان الفاتورة
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  const vatRate = invoice.vatRate ?? 0;
  const vatAmount = invoice.vatAmount ?? 0;
  const isVat = vatRate > 0;
  const title = isVat ? 'فاتورة ضريبية مبسّطة' : 'فاتورة دفعة مستحقة';
  doc.text(title, 105, y + 2, { align: 'center' });
  y += 12;

  // جدول key-value كالحالي
  const rows: string[][] = [
    ['رقم الفاتورة', invoice.invoiceNumber],
    ['رقم العقد', invoice.contractNumber],
    ['المستأجر', invoice.tenantName],
    ['العقار', invoice.propertyNumber],
    ['رقم الدفعة', `${invoice.paymentNumber} من ${invoice.totalPayments}`],
  ];

  if (isVat) {
    const amountExVat = invoice.amount - vatAmount;
    rows.push(['المبلغ قبل الضريبة', `${amountExVat.toLocaleString()} ر.س`]);
    rows.push([`ضريبة القيمة المضافة (${vatRate}%)`, `${vatAmount.toLocaleString()} ر.س`]);
    rows.push(['الإجمالي شاملاً الضريبة', `${invoice.amount.toLocaleString()} ر.س`]);
  } else {
    rows.push(['المبلغ', `${invoice.amount.toLocaleString()} ر.س`]);
  }

  rows.push(['تاريخ الاستحقاق', invoice.dueDate]);
  rows.push(['الحالة', statusLabel(invoice.status)]);

  if (!isVat) rows.push(['ضريبة القيمة المضافة', 'معفاة من ضريبة القيمة المضافة']);
  if (invoice.paidDate) rows.push(['تاريخ السداد', invoice.paidDate]);
  if (invoice.paidAmount && invoice.paidAmount > 0) rows.push(['المبلغ المسدد', `${invoice.paidAmount.toLocaleString()} ر.س`]);
  if (invoice.notes) rows.push(['ملاحظات', invoice.notes]);

  autoTable(doc, {
    startY: y,
    head: [['البيان', 'التفاصيل']],
    body: rows,
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
  });

  const finalY = getLastAutoTableY(doc, y + 100);

  // بيانات الدفع
  renderBankDetails(doc, fontFamily, waqfInfo, finalY, pageW);

  // QR Code
  if (isVat && waqfInfo?.vatNumber) {
    await renderQrCode(doc, fontFamily, invoice, waqfInfo, 82.5, finalY + 2, 45);
  }

  // ملاحظة
  const noteY = (isVat && waqfInfo?.vatNumber) ? finalY + 52 : finalY + 16;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('هذه الفاتورة صادرة إلكترونياً من نظام إدارة الوقف', 105, noteY, { align: 'center' });
  doc.setTextColor(0, 0, 0);
};

/* ─── القالب الضريبي الاحترافي (مطابق للمرجع) ─── */
const renderTaxProfessional = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const pageW = doc.internal.pageSize.width;
  const margin = 14;
  let y = 14;
  const vatRate = invoice.vatRate ?? 0;
  const isVat = vatRate > 0;

  // === صف 1: "فاتورة ضريبية" (يسار) + اسم المنشأة + بياناتها (يمين) ===
  // عنوان "فاتورة ضريبية" — أعلى يسار
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(14);
  doc.text(isVat ? 'فاتورة ضريبية' : 'فاتورة', margin, y + 4, { align: 'left' });

  // اسم المنشأة — أعلى يمين
  doc.setFontSize(14);
  doc.text(waqfInfo?.waqfName || '', pageW - margin, y + 4, { align: 'right' });
  y += 8;

  // بيانات البائع تحت الاسم (يمين)
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  if (waqfInfo?.vatNumber) {
    doc.text(`الرقم الضريبي : ${waqfInfo.vatNumber}`, pageW - margin, y, { align: 'right' });
    y += 4;
  }
  if (waqfInfo?.commercialReg) {
    doc.text(`السجل التجاري : ${waqfInfo.commercialReg}`, pageW - margin, y, { align: 'right' });
    y += 4;
  }
  if (waqfInfo?.address) {
    doc.text(waqfInfo.address, pageW - margin, y, { align: 'right' });
    y += 4;
  }

  // QR Code — أعلى يسار (بجانب عنوان "فاتورة ضريبية")
  const qrSize = 30;
  const qrX = margin;
  const qrY = 20;
  await renderQrCode(doc, fontFamily, invoice, waqfInfo, qrX, qrY, qrSize);

  // شعار — يمين بجانب بيانات البائع
  if (waqfInfo?.logoUrl) {
    const logoData = await loadLogoBase64(waqfInfo.logoUrl);
    if (logoData) {
      try { doc.addImage(logoData, 'PNG', pageW - margin - 55, 16, 22, 22); } catch { /* ignore */ }
    }
  }

  y = Math.max(y, qrY + qrSize + 4);

  // خط فاصل
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // === صف 2: رقم الفاتورة + التاريخ (يسار) | بيانات العميل (يمين) ===
  const metaStartY = y;

  // بيانات الفاتورة (يسار)
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8);
  doc.text('الرقم', margin + 50, y, { align: 'right' });
  doc.setFont(fontFamily, 'normal');
  doc.text(invoice.invoiceNumber, margin, y, { align: 'left' });
  y += 5;
  doc.setFont(fontFamily, 'bold');
  doc.text('التاريخ', margin + 50, y, { align: 'right' });
  doc.setFont(fontFamily, 'normal');
  doc.text(invoice.dueDate, margin, y, { align: 'left' });
  y += 5;
  doc.setFont(fontFamily, 'bold');
  doc.text('العقد', margin + 50, y, { align: 'right' });
  doc.setFont(fontFamily, 'normal');
  doc.text(invoice.contractNumber, margin, y, { align: 'left' });
  y += 5;
  doc.setFont(fontFamily, 'bold');
  doc.text('العقار', margin + 50, y, { align: 'right' });
  doc.setFont(fontFamily, 'normal');
  doc.text(invoice.propertyNumber, margin, y, { align: 'left' });
  y += 5;
  doc.setFont(fontFamily, 'bold');
  doc.text('الدفعة', margin + 50, y, { align: 'right' });
  doc.setFont(fontFamily, 'normal');
  doc.text(`${invoice.paymentNumber} من ${invoice.totalPayments}`, margin, y, { align: 'left' });

  // بيانات العميل (يمين)
  let clientY = metaStartY;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.text(`العميل : ${invoice.tenantName}`, pageW - margin, clientY, { align: 'right' });
  clientY += 5;
  if (invoice.tenantVatNumber) {
    doc.text(`الرقم الضريبي : ${invoice.tenantVatNumber}`, pageW - margin, clientY, { align: 'right' });
    clientY += 5;
  }
  if (invoice.tenantAddress) {
    doc.text(`العنوان : ${invoice.tenantAddress}`, pageW - margin, clientY, { align: 'right' });
    clientY += 5;
  }

  y = Math.max(y, clientY) + 6;

  // الحالة
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(8);
  doc.text(`الحالة: ${statusLabel(invoice.status)}`, pageW - margin, y, { align: 'right' });
  if (invoice.paidDate) {
    doc.setFont(fontFamily, 'normal');
    doc.text(`تاريخ السداد: ${invoice.paidDate}`, margin, y, { align: 'left' });
  }
  y += 6;

  // خط فاصل
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  // === جدول البنود (8 أعمدة) ===
  renderLineItemsTable(doc, fontFamily, invoice, y);
  const tableEndY = getLastAutoTableY(doc, y + 40);

  // ملخص ضريبي
  let summaryEndY = renderVatSummary(doc, fontFamily, invoice, tableEndY + 4, pageW);

  // بيانات الدفع
  summaryEndY = renderBankDetails(doc, fontFamily, waqfInfo, summaryEndY + 2, pageW);

  // ملاحظات
  if (invoice.notes) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`ملاحظات: ${invoice.notes}`, pageW - margin, summaryEndY + 6, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    summaryEndY += 10;
  }

  // ملاحظة إلكترونية
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('هذه الفاتورة صادرة إلكترونياً من نظام إدارة الوقف', pageW / 2, summaryEndY + 8, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
};

/* ─── القالب المختصر ─── */
const renderCompact = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const pageW = doc.internal.pageSize.width;
  const margin = 14;
  let y = 12;

  // اسم الوقف + عنوان مختصر
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(11);
  if (waqfInfo?.waqfName) {
    doc.text(waqfInfo.waqfName, pageW / 2, y, { align: 'center' });
    y += 6;
  }

  const vatRate = invoice.vatRate ?? 0;
  const isVat = vatRate > 0;
  doc.setFontSize(10);
  doc.text(isVat ? 'فاتورة ضريبية مبسّطة' : 'فاتورة', pageW / 2, y, { align: 'center' });
  y += 4;

  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // معلومات أساسية في سطر واحد
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  const metaLine = `الفاتورة: ${invoice.invoiceNumber}  |  العقد: ${invoice.contractNumber}  |  المستأجر: ${invoice.tenantName}  |  العقار: ${invoice.propertyNumber}`;
  doc.text(metaLine, pageW / 2, y, { align: 'center' });
  y += 4;
  doc.text(`الدفعة ${invoice.paymentNumber} من ${invoice.totalPayments}  |  الاستحقاق: ${invoice.dueDate}  |  الحالة: ${statusLabel(invoice.status)}`, pageW / 2, y, { align: 'center' });
  y += 6;

  // جدول بنود مبسّط
  const vatAmount = invoice.vatAmount ?? 0;
  const amountExVat = invoice.amount - vatAmount;

  autoTable(doc, {
    startY: y,
    head: [['الوصف', 'المبلغ', 'الضريبة', 'الإجمالي']],
    body: [[
      `إيجار — دفعة ${invoice.paymentNumber}`,
      `${amountExVat.toLocaleString()}`,
      `${vatAmount.toLocaleString()} (${vatRate}%)`,
      `${invoice.amount.toLocaleString()} ر.س`,
    ]],
    theme: 'grid',
    ...baseTableStyles(fontFamily),
    headStyles: {
      fillColor: TABLE_HEAD_GREEN,
      font: fontFamily,
      fontStyle: 'bold' as const,
      fontSize: 7,
      cellPadding: 2,
    },
    styles: {
      halign: 'center' as const,
      font: fontFamily,
      fontStyle: 'normal' as const,
      cellPadding: 2,
      fontSize: 7,
    },
  });

  const tableEndY = getLastAutoTableY(doc, y + 25);
  let endY = tableEndY + 4;

  // سطر الإجمالي
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(10);
  doc.text(`الإجمالي: ${invoice.amount.toLocaleString()} ر.س`, pageW / 2, endY, { align: 'center' });
  endY += 6;

  // بيانات الدفع مختصرة
  if (waqfInfo?.bankIBAN) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7);
    const bankLine = [waqfInfo.bankName, waqfInfo.bankIBAN].filter(Boolean).join('  |  IBAN: ');
    doc.text(bankLine, pageW / 2, endY, { align: 'center' });
    endY += 5;
  }

  // QR مصغّر
  if (isVat && waqfInfo?.vatNumber) {
    await renderQrCode(doc, fontFamily, invoice, waqfInfo, (pageW - 25) / 2, endY, 25);
    endY += 28;
  }

  // ملاحظة
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text('فاتورة إلكترونية — نظام إدارة الوقف', pageW / 2, endY, { align: 'center' });
  doc.setTextColor(0, 0, 0);
};

/* ─── الدالة الرئيسية ─── */
export const generatePaymentInvoicePDF = async (
  invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
  template: InvoiceTemplate = 'tax_professional',
): Promise<string | null> => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  // رسم القالب المختار
  switch (template) {
    case 'classic':
      await renderClassic(doc, fontFamily, invoice, waqfInfo);
      break;
    case 'compact':
      await renderCompact(doc, fontFamily, invoice, waqfInfo);
      break;
    case 'tax_professional':
    default:
      await renderTaxProfessional(doc, fontFamily, invoice, waqfInfo);
      break;
  }

  // تذييل (كلاسيكي و ضريبي فقط — المختصر بدون إطار)
  if (template !== 'compact') {
    addFooter(doc, fontFamily, waqfInfo);
  }

  // Upload to Storage
  try {
    const pdfBlob = doc.output('blob');
    const safeNumber = sanitizePath(invoice.invoiceNumber);
    const storagePath = `payment-invoices/${safeNumber}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError?.message?.includes('already exists') || uploadError?.message?.includes('Duplicate')) {
      const timestampPath = `payment-invoices/${invoice.invoiceNumber}-${Date.now()}.pdf`;
      const { error: retryError } = await supabase.storage
        .from('invoices')
        .upload(timestampPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (!retryError) {
        await supabase
          .from('payment_invoices')
          .update({ file_path: timestampPath })
          .eq('id', invoice.id);
      }
    } else if (!uploadError) {
      await supabase
        .from('payment_invoices')
        .update({ file_path: storagePath })
        .eq('id', invoice.id);
    }

    return URL.createObjectURL(pdfBlob);
  } catch {
    doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
    return null;
  }
};
