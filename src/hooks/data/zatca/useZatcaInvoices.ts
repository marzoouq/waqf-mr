/**
 * useZatcaInvoices — جلب فواتير ZATCA + سلسلة التوقيع + ترقيم الصفحات + عدّادات الحالة
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { zatcaInvoicesService } from '@/lib/services/zatcaInvoicesService';
import { zatcaKeys } from '@/lib/queryKeys/zatcaKeys';

export const INVOICES_PER_PAGE = 20;

export function useZatcaInvoices() {
  const { fiscalYearId } = useFiscalYear();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoicePage, setInvoicePage] = useState(1);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: zatcaKeys.invoices(statusFilter, fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: () => zatcaInvoicesService.listInvoices({ statusFilter, fiscalYearId }),
  });

  const { data: paymentInvoices = [] } = useQuery({
    queryKey: zatcaKeys.paymentInvoices(statusFilter, fiscalYearId),
    staleTime: STALE_FINANCIAL,
    queryFn: () => zatcaInvoicesService.listPaymentInvoices({ statusFilter, fiscalYearId }),
  });

  const allInvoices = useMemo(() => [...invoices, ...paymentInvoices], [invoices, paymentInvoices]);
  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * INVOICES_PER_PAGE;
    return allInvoices.slice(start, start + INVOICES_PER_PAGE);
  }, [allInvoices, invoicePage]);

  const { data: chain = [], isLoading: chainLoading } = useQuery({
    queryKey: ['invoice-chain'],
    staleTime: STALE_FINANCIAL,
    queryFn: () => zatcaInvoicesService.listInvoiceChain(),
    select: (result) => result.records,
  });

  const submitted = allInvoices.filter(i => ['submitted', 'reported', 'cleared', 'compliance_passed'].includes(i.zatca_status || '')).length;
  const pending = allInvoices.filter(i => i.zatca_status === 'not_submitted' || !i.zatca_status).length;
  const rejected = allInvoices.filter(i => i.zatca_status === 'rejected').length;

  return {
    allInvoices, paginatedInvoices, invoicesLoading,
    chain, chainLoading,
    submitted, pending, rejected,
    statusFilter, setStatusFilter,
    invoicePage, setInvoicePage,
    INVOICES_PER_PAGE,
  };
}
