/**
 * القالب الضريبي الاحترافي (مطابق للمرجع + ZATCA)
 */
import jsPDF from 'jspdf';
import { PdfWaqfInfo, loadLogoBase64, reshapeArabic as rs } from './core';
import { getLastAutoTableY } from './pdfHelpers';
import { fmt } from '@/utils/format';
import {
  type PaymentInvoicePdfData, statusLabel,
  renderLineItemsTable, renderAllowanceChargeTable,
  renderVatSummary, renderBankDetails, renderQrCode,
} from './paymentInvoiceShared';

export const renderTaxProfessional = async (
  doc: jsPDF, fontFamily: string, invoice: PaymentInvoicePdfData,
  waqfInfo?: PdfWaqfInfo,
) => {
  const pageW = doc.internal.pageSize.width;
  const margin = 14;
  let y = 14;
  const vatRate = invoice.vatRate ?? 0;
  const isVat = vatRate > 0;

  const missingText = '(غير مُعرَّف)';
  const renderField = (label: string, value: string | undefined, xPos: number, yPos: number) => {
    if (value) {
      doc.setTextColor(0, 0, 0);
      doc.text(`${label} : ${value}`, xPos, yPos, { align: 'right' });
    } else {
      doc.setTextColor(180, 60, 60);
      doc.text(`${label} : ${missingText}`, xPos, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }
  };

  // --- الشعار أقصى اليمين ---
  const logoSize = 24;
  const logoX = pageW - margin - logoSize;
  const logoY = y;
  let sellerRightEdge = pageW - margin;
  if (waqfInfo?.logoUrl) {
    const logoData = await loadLogoBase64(waqfInfo.logoUrl);
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
        sellerRightEdge = logoX - 4;
      } catch { /* تجاهل أخطاء الشعار */ }
    }
  }

  // --- عنوان ثنائي اللغة أعلى يسار ---
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 101, 52);
  const titleAr = isVat ? rs('فاتورة ضريبية') : rs('فاتورة');
  const titleEn = isVat ? 'Tax Invoice' : 'Invoice';
  doc.text(titleAr, margin, y + 4, { align: 'left' });
  doc.setFontSize(10);
  doc.text(titleEn, margin, y + 10, { align: 'left' });
  doc.setTextColor(0, 0, 0);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, margin, y + 16, { align: 'left' });
  doc.text(`Date: ${invoice.dueDate}`, margin, y + 21, { align: 'left' });

  // --- اسم المنشأة أعلى يمين ---
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text(rs(waqfInfo?.waqfName || missingText), sellerRightEdge, y + 4, { align: 'right' });

  // --- بيانات البائع ---
  let sellerY = y + 11;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);

  renderField('الرقم الضريبي', waqfInfo?.vatNumber, sellerRightEdge, sellerY);
  sellerY += 5;
  renderField('السجل التجاري', waqfInfo?.commercialReg, sellerRightEdge, sellerY);
  sellerY += 5;
  renderField('العنوان', waqfInfo?.address, sellerRightEdge, sellerY);
  sellerY += 5;

  // --- QR Code ---
  const qrSize = 35;
  const qrX = margin;
  const qrY = y + 24;
  await renderQrCode(doc, fontFamily, invoice, waqfInfo, qrX, qrY, qrSize);

  y = Math.max(sellerY, qrY + qrSize + 2, logoY + logoSize + 2);

  // خط فاصل أخضر
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // صف 2: بيانات الفاتورة (يسار) | بيانات العميل (يمين)
  const metaStartY = y;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(9);
  doc.text(rs('بيانات الفاتورة'), margin, y, { align: 'left' });
  y += 5;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);

  const metaItems = [
    ['رقم العقد', invoice.contractNumber],
    ['العقار', invoice.propertyNumber],
    ['الدفعة', `${invoice.paymentNumber} من ${invoice.totalPayments}`],
    ['الحالة', statusLabel(invoice.status)],
  ];
  if (invoice.paidDate) metaItems.push(['تاريخ السداد', invoice.paidDate]);

  for (const [label, val] of metaItems) {
    doc.setFont(fontFamily, 'bold');
    doc.text(`${label}:`, margin + 45, y, { align: 'right' });
    doc.setFont(fontFamily, 'normal');
    doc.text(val, margin, y, { align: 'left' });
    y += 5;
  }

  // بيانات العميل (يمين)
  let clientY = metaStartY;
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(9);
  doc.text(rs('بيانات العميل'), pageW - margin, clientY, { align: 'right' });
  clientY += 5;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.text(rs(`الاسم : ${invoice.tenantName}`), pageW - margin, clientY, { align: 'right' });
  clientY += 5;
  if (invoice.tenantVatNumber) {
    doc.text(rs(`الرقم الضريبي : ${invoice.tenantVatNumber}`), pageW - margin, clientY, { align: 'right' });
    clientY += 5;
  }
  if (invoice.tenantAddress) {
    doc.text(rs(`العنوان : ${invoice.tenantAddress}`), pageW - margin, clientY, { align: 'right' });
    clientY += 5;
  }

  y = Math.max(y, clientY) + 4;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  // === جدول البنود ===
  renderLineItemsTable(doc, fontFamily, invoice, y);
  let tableEndY = getLastAutoTableY(doc, y + 40);

  // === جدول الخصومات/الرسوم ===
  tableEndY = renderAllowanceChargeTable(doc, fontFamily, invoice, tableEndY + 2);

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

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(rs('هذه الفاتورة صادرة إلكترونياً من نظام إدارة الوقف'), pageW / 2, summaryEndY + 8, { align: 'center' });
  doc.setTextColor(0, 0, 0);
};
