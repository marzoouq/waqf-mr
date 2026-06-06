/**
 * هوك مساعد: تصدير/طباعة التقرير السنوي.
 * مُستخرَج من useAnnualReportPage للحفاظ على حد 200 سطر (Container vs Presentational).
 */
import { useCallback } from 'react';
import { usePrint } from '@/hooks/ui/usePrint';
import type { AnnualReportItem } from '@/hooks/data/content/useAnnualReport';
import type { AnnualReportPdfData } from '@/utils/pdf/reports/annualReport';

interface Property { id: string; property_number: string; location: string; }
interface SummaryCard { label: string; value: string; }
interface Grouped {
  property_status: AnnualReportItem[];
  achievement: AnnualReportItem[];
  challenge: AnnualReportItem[];
  future_plan: AnnualReportItem[];
}

interface Params {
  fiscalYearLabel: string;
  grouped: Grouped;
  properties: Property[];
  summaryCards: SummaryCard[];
  waqfInfo: unknown;
}

export function useAnnualReportExport({ fiscalYearLabel, grouped, properties, summaryCards, waqfInfo }: Params) {
  const fallbackPrint = usePrint();

  const handleExportPdf = useCallback(async () => {
    const pdfData: AnnualReportPdfData = {
      fiscalYearLabel,
      achievements: grouped.achievement.map(i => ({ title: i.title, content: i.content })),
      challenges: grouped.challenge.map(i => ({ title: i.title, content: i.content })),
      futurePlans: grouped.future_plan.map(i => ({ title: i.title, content: i.content })),
      propertyStatuses: grouped.property_status.map(i => {
        const prop = properties.find(p => p.id === i.property_id);
        return { title: i.title, content: i.content, propertyName: prop ? `${prop.property_number} — ${prop.location}` : undefined };
      }),
      summaryCards,
    };
    const { generateAnnualReportPDF } = await import('@/utils/pdf/reports/annualReport');
    const ok = await generateAnnualReportPDF(pdfData, waqfInfo as never);
    const { toast } = await import('sonner');
    if (ok) toast.success('تم تصدير التقرير السنوي بنجاح');
    else toast.error('فشل في تصدير التقرير');
  }, [fiscalYearLabel, grouped, properties, summaryCards, waqfInfo]);

  const handlePrint = useCallback(async () => {
    try {
      await handleExportPdf();
    } catch {
      fallbackPrint();
    }
  }, [handleExportPdf, fallbackPrint]);

  return { handleExportPdf, handlePrint };
}
