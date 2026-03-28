/**
 * حسابات مالية مشتركة (مطابقة لـ computeInvoiceTotals في HTML)
 */
import type { PaymentInvoicePdfData } from './types';

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
