/**
 * رسم QR Code في مستند PDF مع retry + fallback مرئي
 */
import type jsPDF from 'jspdf';
import { generateZatcaQrTLV, generateQrDataUrl } from '@/utils/zatcaQr';
import { logger } from '@/lib/logger';
import type { PdfWaqfInfo } from '../core';
import type { PaymentInvoicePdfData } from './types';

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
