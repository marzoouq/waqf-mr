/**
 * أنواع ودوال مشتركة لقوالب الفواتير
 */
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';
import { generateZatcaQrTLV } from '@/utils/zatcaQr';

// ─── الأنواع المشتركة ───
export interface AllowanceChargeItem {
  reason: string;
  amount: number;
  vatRate: number;
}

export interface InvoiceTemplateData {
  id?: string;
  invoiceNumber: string;
  date: string;
  type: 'simplified' | 'standard';
  sellerName: string;
  sellerAddress?: string;
  sellerVatNumber?: string;
  sellerCR?: string;
  sellerLogo?: string;
  buyerName: string;
  buyerAddress?: string;
  buyerVatNumber?: string;
  buyerCR?: string;
  buyerIdType?: string;
  buyerIdNumber?: string;
  buyerStreet?: string;
  buyerDistrict?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  buyerBuilding?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
  allowances?: AllowanceChargeItem[];
  charges?: AllowanceChargeItem[];
  notes?: string;
  status: string;
  bankName?: string;
  bankIBAN?: string;
  zatcaUuid?: string;
  icv?: number;
  zatcaStatus?: string;
  qrTlvBase64?: string;
}

// ─── حسابات مشتركة ───
export function computeInvoiceTotals(data: InvoiceTemplateData) {
  const items = data.items.map(item => {
    const subtotal = safeNumber(item.quantity) * safeNumber(item.unitPrice);
    const vatAmount = Math.round(subtotal * (safeNumber(item.vatRate) / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { ...item, subtotal, vatAmount, total };
  });

  const lineExtension = items.reduce((s, i) => s + i.subtotal, 0);
  const totalAllowances = (data.allowances || []).reduce((s, a) => s + safeNumber(a.amount), 0);
  const totalCharges = (data.charges || []).reduce((s, c) => s + safeNumber(c.amount), 0);
  const taxExclusive = lineExtension - totalAllowances + totalCharges;

  const itemsVat = items.reduce((s, i) => s + i.vatAmount, 0);
  const allowancesVat = (data.allowances || []).reduce((s, a) => s + Math.round(safeNumber(a.amount) * safeNumber(a.vatRate) / 100 * 100) / 100, 0);
  const chargesVat = (data.charges || []).reduce((s, c) => s + Math.round(safeNumber(c.amount) * safeNumber(c.vatRate) / 100 * 100) / 100, 0);
  const totalVat = Math.round((itemsVat - allowancesVat + chargesVat) * 100) / 100;
  const grandTotal = Math.round((taxExclusive + totalVat) * 100) / 100;

  return { items, lineExtension, totalAllowances, totalCharges, taxExclusive, totalVat, grandTotal };
}

export function generateQR(data: InvoiceTemplateData, grandTotal: number, totalVat: number) {
  return data.qrTlvBase64 || (data.sellerVatNumber ? generateZatcaQrTLV({
    sellerName: data.sellerName,
    vatNumber: data.sellerVatNumber,
    timestamp: new Date(data.date).toISOString(),
    totalWithVat: grandTotal,
    vatAmount: totalVat,
  }) : null);
}

// ─── دوال مساعدة ───
export const statusLabel = (s: string) => {
  switch (s) {
    case 'paid': return 'مسددة';
    case 'pending': return 'قيد الانتظار';
    case 'overdue': return 'متأخرة';
    case 'cancelled': return 'ملغاة';
    default: return s;
  }
};

export const statusColor = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (s) {
    case 'paid': return 'default';
    case 'pending': return 'secondary';
    case 'overdue': return 'destructive';
    default: return 'outline';
  }
};

export const ID_TYPE_LABELS: Record<string, string> = {
  NAT: 'هوية وطنية', IQA: 'إقامة', PAS: 'جواز سفر',
  CRN: 'سجل تجاري', GCC: 'هوية خليجية', OTH: 'أخرى',
};

export const fmtNum = (n: number) => fmt(n);
