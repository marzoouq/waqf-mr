/**
 * دوال مشتركة بين قوالب فواتير الدفعات الثلاثة
 */
import type jsPDF from 'jspdf';
import {
  PdfWaqfInfo,
  TABLE_HEAD_GREEN,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { generateZatcaQrTLV, generateQrDataUrl } from '@/utils/zatcaQr';
import { logger } from '@/lib/logger';
import { fmt } from '@/utils/format';

export type InvoiceTemplate = 'classic' | 'tax_professional' | 'compact';

export interface PaymentInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

/** خصم أو رسوم إضافية — مطابق لـ AllowanceChargeItem في HTML */
export interface PdfAllowanceChargeItem {
  reason: string;
  amount: number;
  vatRate: number;
}

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
  /** بنود متعددة اختيارية — إذا لم تُوفّر يُولّد صف إيجار واحد */
  lineItems?: PaymentInvoiceLineItem[];
  /** خصومات (AllowanceCharge - Allowance) */
  allowances?: PdfAllowanceChargeItem[];
  /** رسوم إضافية (AllowanceCharge - Charge) */
  charges?: PdfAllowanceChargeItem[];
}

export const statusLabel = (s: string) => {
  switch (s) {
    case 'paid': return rs('مسددة');
    case 'pending': return rs('قيد الانتظار');
    case 'overdue': return rs('متأخرة');
    case 'partially_paid': return rs('مسددة جزئياً');
    default: return rs(s);
  }
};

// INV-CRIT-1: sanitize مسار الملف لمنع path traversal
export const sanitizePath = (name: string) => name.replace(/[./\\]+/g, '_');

/* ─── دوال رسم مشتركة ─── */

// رسم بيانات البائع
export const renderSellerInfo = (
  doc: jsPDF, fontFamily: string, waqfInfo: PdfWaqfInfo | undefined,
  startY: number, pageW: number, compact = false,
) => {
  if (!waqfInfo?.waqfName) return startY;
  const margin = 18;
  let y = startY;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(compact ? 10 : 12);
  doc.text(rs(waqfInfo.waqfName), pageW - margin, y, { align: 'right' });
  y += compact ? 5 : 7;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(compact ? 7 : 8);

  if (waqfInfo.vatNumber) {
    doc.text(rs(`الرقم الضريبي: ${waqfInfo.vatNumber}`), pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }
  if (waqfInfo.commercialReg) {
    doc.text(rs(`السجل التجاري: ${waqfInfo.commercialReg}`), pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }
  if (waqfInfo.address) {
    doc.text(rs(`العنوان: ${waqfInfo.address}`), pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }

  return y;
};

// رسم بيانات المشتري
export const renderBuyerInfo = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number, pageW: number, compact = false,
) => {
  const margin = 18;
  let y = startY;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(compact ? 8 : 9);
  doc.text(rs('بيانات العميل'), pageW - margin, y, { align: 'right' });
  y += compact ? 4 : 5;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(compact ? 7 : 8);
  doc.text(rs(`الاسم: ${invoice.tenantName}`), pageW - margin, y, { align: 'right' });
  y += compact ? 4 : 5;

  if (invoice.tenantVatNumber) {
    doc.text(rs(`الرقم الضريبي: ${invoice.tenantVatNumber}`), pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }
  if (invoice.tenantAddress) {
    doc.text(rs(`العنوان: ${invoice.tenantAddress}`), pageW - margin, y, { align: 'right' });
    y += compact ? 4 : 5;
  }

  return y;
};

// رسم معلومات الفاتورة (رقم + تاريخ + عقد + عقار)
export const renderInvoiceMeta = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number, _pageW: number, compact = false,
) => {
  const margin = 18;
  let y = startY;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(compact ? 7 : 8);

  const leftItems = [
    [rs(`رقم الفاتورة: ${invoice.invoiceNumber}`)],
    [rs(`التاريخ: ${invoice.dueDate}`)],
    [rs(`رقم العقد: ${invoice.contractNumber}`)],
    [rs(`العقار: ${invoice.propertyNumber}`)],
    [rs(`الدفعة: ${invoice.paymentNumber} من ${invoice.totalPayments}`)],
  ];

  for (const item of leftItems) {
    doc.text(item[0] ?? '', margin, y, { align: 'left' });
    y += compact ? 4 : 5;
  }

  return y;
};

// رسم جدول البنود (8 أعمدة) — يدعم بنوداً متعددة
export const renderLineItemsTable = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number,
) => {
  const { default: autoTable } = await import('jspdf-autotable');
  // بناء صفوف البنود: إذا وُجدت lineItems نستخدمها، وإلا صف إيجار واحد
  const rows: string[][] = [];
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    invoice.lineItems.forEach((item, idx) => {
      const baseTotal = item.quantity * item.unitPrice;
      const itemVat = baseTotal * (item.vatRate / 100);
      rows.push([
        `${idx + 1}`,
        rs(item.description),
        `${item.quantity}`,
        fmt(item.unitPrice),
        fmt(baseTotal),
        `${item.vatRate}%`,
        fmt(itemVat),
        fmt(baseTotal + itemVat),
      ]);
    });
  } else {
    const vatRate = invoice.vatRate ?? 0;
    const vatAmount = invoice.vatAmount ?? 0;
    const amountExVat = invoice.amount - vatAmount;
    rows.push([
      '1',
      rs(`إيجار — دفعة ${invoice.paymentNumber}`),
      '1',
      fmt(amountExVat),
      fmt(amountExVat),
      `${vatRate}%`,
      fmt(vatAmount),
      fmt(invoice.amount),
    ]);
  }

  autoTable(doc, {
    startY,
    head: [reshapeRow(['#', 'الوصف', 'الكمية', 'سعر الوحدة', 'المجموع بدون ضريبة', 'نسبة الضريبة', 'قيمة الضريبة', 'الإجمالي'])],
    body: rows,
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

// حسابات موحّدة مع HTML (computeInvoiceTotals) — تدعم AllowanceCharge
export const computePdfTotals = (invoice: PaymentInvoicePdfData) => {
  let lineExtension: number;
  let itemsVat: number;

  if (invoice.lineItems && invoice.lineItems.length > 0) {
    lineExtension = invoice.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    itemsVat = invoice.lineItems.reduce((s, i) => {
      const base = i.quantity * i.unitPrice;
      return s + Math.round(base * (i.vatRate / 100) * 100) / 100;
    }, 0);
  } else {
    const vatAmount = invoice.vatAmount ?? 0;
    lineExtension = invoice.amount - vatAmount;
    itemsVat = vatAmount;
  }

  const totalAllowances = (invoice.allowances || []).reduce((s, a) => s + (a.amount || 0), 0);
  const totalCharges = (invoice.charges || []).reduce((s, c) => s + (c.amount || 0), 0);
  const allowancesVat = (invoice.allowances || []).reduce((s, a) => s + Math.round(a.amount * a.vatRate / 100 * 100) / 100, 0);
  const chargesVat = (invoice.charges || []).reduce((s, c) => s + Math.round(c.amount * c.vatRate / 100 * 100) / 100, 0);

  const taxExclusive = lineExtension - totalAllowances + totalCharges;
  const totalVat = Math.round((itemsVat - allowancesVat + chargesVat) * 100) / 100;
  const grandTotal = Math.round((taxExclusive + totalVat) * 100) / 100;

  return { lineExtension, totalAllowances, totalCharges, allowancesVat, chargesVat, taxExclusive, itemsVat, totalVat, grandTotal };
};

// رسم جدول الخصومات والرسوم الإضافية (AllowanceCharge)
export const renderAllowanceChargeTable = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number,
) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const allowances = invoice.allowances || [];
  const charges = invoice.charges || [];
  if (allowances.length === 0 && charges.length === 0) return startY;

  const rows: string[][] = [];
  for (const a of allowances) {
    const vat = Math.round(a.amount * a.vatRate / 100 * 100) / 100;
    rows.push(reshapeRow(['خصم', a.reason, `-${fmt(a.amount)}`, `${a.vatRate}%`, `-${fmt(vat)}`]) as string[]);
  }
  for (const c of charges) {
    const vat = Math.round(c.amount * c.vatRate / 100 * 100) / 100;
    rows.push(reshapeRow(['رسوم إضافية', c.reason, `+${fmt(c.amount)}`, `${c.vatRate}%`, `+${fmt(vat)}`]) as string[]);
  }

  autoTable(doc, {
    startY,
    head: [reshapeRow(['النوع', 'السبب', 'المبلغ', 'نسبة الضريبة', 'قيمة الضريبة'])],
    body: rows,
    theme: 'grid',
    ...baseTableStyles(fontFamily),
    headStyles: {
      fillColor: [100, 100, 100] as [number, number, number],
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
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 50, halign: 'right' as const },
    },
  });

  return getLastAutoTableY(doc, startY + 20);
};

// رسم ملخص الضريبة — يدعم الخصومات والرسوم
export const renderVatSummary = (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number, pageW: number,
) => {
  const margin = 18;
  const totals = computePdfTotals(invoice);
  let y = startY;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(9);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2, y, pageW - margin, y);
  y += 6;

  const summaryItems: [string, string][] = [
    [rs('إجمالي البنود:'), rs(`${fmt(totals.lineExtension)} ر.س`)],
  ];

  if (totals.totalAllowances > 0) {
    summaryItems.push([rs('خصومات:'), rs(`-${fmt(totals.totalAllowances)} ر.س`)]);
  }
  if (totals.totalCharges > 0) {
    summaryItems.push([rs('رسوم إضافية:'), rs(`+${fmt(totals.totalCharges)} ر.س`)]);
  }

  summaryItems.push(
    [rs('الإجمالي قبل الضريبة:'), rs(`${fmt(totals.taxExclusive)} ر.س`)],
    [rs('ضريبة القيمة المضافة:'), rs(`${fmt(totals.totalVat)} ر.س`)],
  );

  for (const [label, value] of summaryItems) {
    doc.text(label, pageW - margin - 60, y, { align: 'right' });
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += 6;
  }

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(11);
  doc.text(rs('الإجمالي شاملاً الضريبة:'), pageW - margin - 60, y, { align: 'right' });
  doc.text(rs(`${fmt(totals.grandTotal)} ر.س`), pageW - margin, y, { align: 'right' });
  y += 4;

  return y;
};

// رسم بيانات الدفع (البنك)
export const renderBankDetails = (
  doc: jsPDF, fontFamily: string, waqfInfo: PdfWaqfInfo | undefined,
  startY: number, pageW: number,
) => {
  if (!waqfInfo?.bankName && !waqfInfo?.bankIBAN) return startY;
  const margin = 18;
  let y = startY + 4;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(9);
  doc.text(rs('بيانات الدفع'), pageW - margin, y, { align: 'right' });
  y += 5;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);

  if (waqfInfo?.bankName) {
    doc.text(rs(`البنك: ${waqfInfo.bankName}`), pageW - margin, y, { align: 'right' });
    y += 5;
  }
  if (waqfInfo?.bankAccount) {
    doc.text(rs(`رقم الحساب: ${waqfInfo.bankAccount}`), pageW - margin, y, { align: 'right' });
    y += 5;
  }
  if (waqfInfo?.bankIBAN) {
    doc.text(`IBAN: ${waqfInfo.bankIBAN}`, margin, y, { align: 'left' });
    y += 5;
  }

  return y;
};

// رسم QR Code — يظهر دائماً حتى لو VAT = 0 مع retry + fallback مرئي
export const renderQrCode = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  waqfInfo: PdfWaqfInfo | undefined, x: number, y: number, size: number,
) => {
  try {
    const vatAmount = invoice.vatAmount ?? 0;

    const rawDate = invoice.paidDate || invoice.dueDate || new Date().toISOString();
    const isoTimestamp = rawDate.includes('T') ? rawDate : new Date(rawDate + 'T00:00:00Z').toISOString();

    const sellerName = waqfInfo?.waqfName || 'غير محدد';
    const vatNumber = waqfInfo?.vatNumber || '000000000000000';

    const tlvBase64 = generateZatcaQrTLV({
      sellerName,
      vatNumber,
      timestamp: isoTimestamp,
      totalWithVat: invoice.amount,
      vatAmount: vatAmount,
    });

    logger.info('[PDF-QR] TLV data:', { sellerName, vatNumber, timestamp: isoTimestamp, total: invoice.amount, vat: vatAmount });

    let qrDataUrl = await generateQrDataUrl(tlvBase64);

    if (!qrDataUrl) {
      logger.warn('[PDF-QR] First attempt returned null, retrying...');
      qrDataUrl = await generateQrDataUrl(tlvBase64);
    }

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', x, y, size, size);
    } else {
      logger.warn('[PDF-QR] generateQrDataUrl returned null — rendering visible fallback');
      drawQrPlaceholder(doc, fontFamily, x, y, size, tlvBase64);
    }
  } catch (err) {
    logger.error('[PDF-QR] Error generating QR code:', err);
    drawQrPlaceholder(doc, fontFamily, x, y, size);
  }
};

// مربع placeholder مرئي عند فشل QR
export const drawQrPlaceholder = (
  doc: jsPDF, fontFamily: string, x: number, y: number, size: number, tlvBase64?: string,
) => {
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.4);
  doc.rect(x, y, size, size);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(150, 150, 150);
  doc.text('QR', x + size / 2, y + size / 2 - 2, { align: 'center' });

  doc.setFontSize(5);
  if (tlvBase64) {
    doc.text(tlvBase64.substring(0, 30) + '...', x + size / 2, y + size / 2 + 4, { align: 'center' });
  } else {
    doc.text('غير متاح', x + size / 2, y + size / 2 + 4, { align: 'center' });
  }

  doc.setTextColor(0, 0, 0);
};
