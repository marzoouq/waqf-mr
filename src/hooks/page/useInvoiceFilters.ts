/**
 * هوك فلاتر وبحث الفواتير — مستخرج من useInvoicesPage
 */
import { useState, useMemo } from 'react';
import { INVOICE_TYPE_LABELS, type Invoice } from '@/hooks/data/useInvoices';

export const useInvoiceFilters = (invoices: Invoice[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      if (filterType !== 'all' && item.invoice_type !== filterType) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (item.invoice_number || '').toLowerCase().includes(q) ||
          (INVOICE_TYPE_LABELS[item.invoice_type] || '').includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          (item.file_name || '').toLowerCase().includes(q) ||
          item.date.includes(q);
      }
      return true;
    });
  }, [invoices, filterType, filterStatus, searchQuery]);

  return {
    searchQuery, setSearchQuery,
    filterType, setFilterType,
    filterStatus, setFilterStatus,
    currentPage, setCurrentPage,
    filteredInvoices,
  };
};
