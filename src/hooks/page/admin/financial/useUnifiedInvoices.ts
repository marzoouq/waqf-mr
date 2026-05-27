/**
 * يدمج فواتير الشراء (invoices) وفواتير الإيجار (payment_invoices) في عرض موحّد
 * ويطبّق فلاتر المصدر/الحالة/البحث. مستخرج من useInvoicesPage لتقليل حجمه.
 */
import { useMemo } from 'react';
import type { Invoice } from '@/hooks/data/invoices/useInvoices';
import { INVOICE_TYPE_LABELS } from '@/hooks/data/invoices/useInvoices';
import type { InvoiceSourceFilter, UnifiedInvoiceItem } from '@/types/invoices';
import { safeNumber } from '@/utils/format/safeNumber';

interface RentInvoiceLike {
  id: string;
  invoice_number: string | null;
  amount: number | string | null;
  paid_amount?: number | string | null;
  vat_amount?: number | string | null;
  due_date: string;
  status: string;
  file_path: string | null;
  contract?: { property?: { property_number: string } | null } | null;
}

export const useUnifiedInvoices = (
  invoices: Invoice[],
  rentInvoices: RentInvoiceLike[],
  sourceFilter: InvoiceSourceFilter,
  filterStatus: string,
  searchQuery: string,
) => {
  const unifiedInvoices: UnifiedInvoiceItem[] = useMemo(() => {
    const expenseItems: UnifiedInvoiceItem[] = invoices.map((inv) => ({
      id: inv.id,
      invoice_type: inv.invoice_type,
      invoice_number: inv.invoice_number,
      amount: safeNumber(inv.amount),
      vat_amount: safeNumber(inv.vat_amount ?? 0),
      date: inv.date,
      status: inv.status,
      file_path: inv.file_path,
      file_name: inv.file_name,
      property: inv.property ? { property_number: inv.property.property_number } : null,
      source: 'purchase',
    }));
    const rentItems: UnifiedInvoiceItem[] = rentInvoices.map((inv) => ({
      id: inv.id,
      invoice_type: 'rent_invoice',
      invoice_number: inv.invoice_number || null,
      amount: safeNumber(inv.amount),
      paid_amount: safeNumber(inv.paid_amount ?? 0),
      vat_amount: safeNumber(inv.vat_amount ?? 0),
      date: inv.due_date,
      status: inv.status,
      file_path: inv.file_path,
      file_name: inv.invoice_number ? `${inv.invoice_number}.pdf` : null,
      property: inv.contract?.property ? { property_number: inv.contract.property.property_number } : null,
      source: 'rent',
    }));
    return [...expenseItems, ...rentItems].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [invoices, rentInvoices]);

  const unifiedFiltered = useMemo(() => unifiedInvoices.filter((item) => {
    if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (item.invoice_number || '').toLowerCase().includes(q) ||
        (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
        item.date.includes(q)
      );
    }
    return true;
  }), [unifiedInvoices, sourceFilter, filterStatus, searchQuery]);

  return { unifiedInvoices, unifiedFiltered };
};
