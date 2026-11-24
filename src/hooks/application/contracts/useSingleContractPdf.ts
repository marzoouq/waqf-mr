/**
 * Downloads the official single-contract PDF (all roles; beneficiaries get no tenant PII
 * because their contract source already excludes it).
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { fetchContractInvoicesForPdf } from '@/hooks/data/contracts/contractInvoicesForPdf';
import { buildSingleContractPdfData, type SingleContractSource } from '@/utils/contracts/singleContractPdfData';


export const useSingleContractPdf = () => {
  const waqfInfo = usePdfWaqfInfo();
  const [busy, setBusy] = useState(false);

  /** withPayments: يجلب كل دفعات العقد عبر السنوات (للناظر والمحاسب). */
  const download = async (source: SingleContractSource & { id?: string | null }, withPayments: boolean, propertyLabel?: string | null) => {
    setBusy(true);
    try {
      const invoices = withPayments && source.id ? await fetchContractInvoicesForPdf(source.id) : [];
      const { generateSingleContractPDF } = await import('@/utils/pdf/entities/singleContractPdf');
      await generateSingleContractPDF(buildSingleContractPdfData(source, invoices, propertyLabel), waqfInfo);
      toast.success('صدر ملف العقد');
    } catch (e) {
      logger.error('[contract-pdf] failed', e);
      toast.error('تعذّر إصدار ملف العقد');
    } finally {
      setBusy(false);
    }
  };

  return { download, busy };
};
