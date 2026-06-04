/**
 * رسم بيانات البائع والمشتري في PDF
 */
import type jsPDF from 'jspdf';
import { PdfWaqfInfo, reshapeArabic as rs } from '../../core/core';
import type { PaymentInvoicePdfData } from '../types';

/** رسم بيانات البائع */
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

/** رسم بيانات المشتري */
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
