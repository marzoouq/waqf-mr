/**
 * رسم جداول البنود والخصومات في PDF
 */
import type jsPDF from 'jspdf';
import {
  TABLE_HEAD_GREEN,
  baseTableStyles, headStyles,
  reshapeArabic as rs, reshapeRow,
} from '@/utils/pdf/core/core';
import { getLastAutoTableY } from '@/utils/pdf/core/pdfHelpers';
import { fmt } from '@/utils/format/format';
import type { PaymentInvoicePdfData } from '@/utils/pdf/shared/types';

/** رسم جدول البنود (8 أعمدة) — يدعم بنوداً متعددة */
export const renderLineItemsTable = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  startY: number,
) => {
  const { default: autoTable } = await import('jspdf-autotable');
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

/** رسم جدول الخصومات والرسوم الإضافية (AllowanceCharge) */
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
