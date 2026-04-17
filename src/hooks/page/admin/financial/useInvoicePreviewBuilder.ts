/**
 * Helper نقي لبناء بيانات معاينة الفاتورة (InvoicePreviewData)
 * — يفصل المنطق العرضي عن orchestrator الصفحة
 */
import { useCallback } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { INVOICE_TYPE_LABELS, type Invoice } from '@/hooks/data/invoices/useInvoices';
import type { InvoicePreviewData } from '@/types/invoices';
import type { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';

type PdfWaqfInfo = ReturnType<typeof usePdfWaqfInfo>;
type ContractLite = {
  id: string;
  tenant_name?: string | null;
  tenant_tax_number?: string | null;
  tenant_crn?: string | null;
  tenant_id_type?: string | null;
  tenant_id_number?: string | null;
  tenant_street?: string | null;
  tenant_district?: string | null;
  tenant_city?: string | null;
  tenant_postal_code?: string | null;
  tenant_building?: string | null;
};

export function useInvoicePreviewBuilder(
  pdfWaqfInfo: PdfWaqfInfo,
  contracts: ContractLite[],
) {
  return useCallback((inv: Invoice): InvoicePreviewData => {
    const contract = contracts.find(c => c.id === inv.contract_id);
    const hasVat = safeNumber(inv.vat_rate) > 0;
    const hasBuyerTax = !!contract?.tenant_tax_number;
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number || `INV-${inv.id.slice(0, 6)}`,
      date: inv.date,
      type: (hasVat && hasBuyerTax) ? 'standard' : 'simplified',
      sellerName: pdfWaqfInfo.waqfName || 'وقف مرزوق بن علي الثبيتي',
      sellerAddress: pdfWaqfInfo.address,
      sellerVatNumber: pdfWaqfInfo.vatNumber,
      sellerCR: pdfWaqfInfo.commercialReg,
      sellerLogo: pdfWaqfInfo.logoUrl,
      buyerName: contract?.tenant_name || inv.contract?.tenant_name || '-',
      buyerVatNumber: contract?.tenant_tax_number || undefined,
      buyerCR: contract?.tenant_crn || undefined,
      buyerIdType: contract?.tenant_id_type || undefined,
      buyerIdNumber: contract?.tenant_id_number || undefined,
      buyerStreet: contract?.tenant_street || undefined,
      buyerDistrict: contract?.tenant_district || undefined,
      buyerCity: contract?.tenant_city || undefined,
      buyerPostalCode: contract?.tenant_postal_code || undefined,
      buyerBuilding: contract?.tenant_building || undefined,
      items: [{
        description: `${INVOICE_TYPE_LABELS[inv.invoice_type] || inv.invoice_type}${inv.description ? ` — ${inv.description}` : ''}`,
        quantity: 1,
        unitPrice: safeNumber(inv.vat_amount) > 0
          ? safeNumber(inv.amount) - safeNumber(inv.vat_amount)
          : (safeNumber(inv.vat_rate) > 0 ? safeNumber(inv.amount) / (1 + safeNumber(inv.vat_rate) / 100) : safeNumber(inv.amount)),
        vatRate: safeNumber(inv.vat_rate),
      }],
      notes: inv.description || undefined,
      status: inv.status,
      bankName: pdfWaqfInfo.bankName,
      bankIBAN: pdfWaqfInfo.bankIBAN,
      zatcaUuid: inv.zatca_uuid || undefined,
      zatcaStatus: inv.zatca_status || undefined,
    };
  }, [pdfWaqfInfo, contracts]);
}
