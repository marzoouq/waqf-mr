/**
 * أزرار تصدير التقارير — مستخرجة من ReportsPage
 */
import { Button } from '@/components/ui/button';
import { FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import ExportMenu from '@/components/ExportMenu';
import type { PdfWaqfInfo, ForensicAuditData } from '@/utils/pdf';

interface IncomeExpenseItem {
  name: string;
  value: number;
}

interface DistItem {
  name?: string;
  percentage?: number;
  amount: number;
}

interface ReportsExportActionsProps {
  currentAccountFY: string;
  fiscalYearLabel?: string;
  totalIncome: number;
  totalExpenses: number;
  waqfCorpusPrevious: number;
  grandTotal: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  availableAmount: number;
  distributionsAmount: number;
  remainingBalance: number;
  adminPct: number;
  waqifPct: number;
  netRevenue: number;
  incomeSourceData: IncomeExpenseItem[];
  expenseTypeData: IncomeExpenseItem[];
  distributionData: DistItem[];
  forensicAuditData: ForensicAuditData;
  pdfWaqfInfo: PdfWaqfInfo;
}

const ReportsExportActions = (props: ReportsExportActionsProps) => {
  const {
    currentAccountFY, fiscalYearLabel, totalIncome, totalExpenses,
    waqfCorpusPrevious, grandTotal, netAfterExpenses, vatAmount, netAfterVat,
    zakatAmount, netAfterZakat, adminShare, waqifShare, waqfRevenue,
    waqfCorpusManual, availableAmount, distributionsAmount, remainingBalance,
    adminPct, waqifPct, netRevenue, incomeSourceData, expenseTypeData,
    distributionData, forensicAuditData, pdfWaqfInfo,
  } = props;

  const fy = currentAccountFY || fiscalYearLabel || '';

  const handleExportPDF = async () => {
    const { generateAnnualReportPDF } = await import('@/utils/pdf');
    await generateAnnualReportPDF({
      fiscalYear: fy, totalIncome, totalExpenses, netRevenue,
      adminShare, waqifShare, waqfRevenue,
      expensesByType: expenseTypeData.map(d => ({ type: d.name, amount: d.value })),
      incomeBySource: incomeSourceData.map(d => ({ source: d.name, amount: d.value })),
      beneficiaries: distributionData.map(d => ({
        name: d.name ?? 'غير معروف', percentage: d.percentage ?? 0, amount: d.amount,
      })),
    }, pdfWaqfInfo);
  };

  const handleDisclosurePDF = async () => {
    const { generateAnnualDisclosurePDF } = await import('@/utils/pdf');
    await generateAnnualDisclosurePDF({
      fiscalYear: fy, totalIncome, totalExpenses, waqfCorpusPrevious, grandTotal,
      netAfterExpenses, vatAmount, netAfterVat, zakatAmount, netAfterZakat,
      adminShare, waqifShare, waqfRevenue, waqfCorpusManual,
      availableAmount, distributionsAmount, remainingBalance,
      incomeBySource: Object.fromEntries(incomeSourceData.map(d => [d.name, d.value])),
      expensesByType: Object.fromEntries(expenseTypeData.map(d => [d.name, d.value])),
      beneficiaries: distributionData.map(d => ({
        name: d.name ?? 'غير معروف', share_percentage: d.percentage ?? 0, amount: d.amount,
      })),
      adminPct, waqifPct,
    }, pdfWaqfInfo);
  };

  const handleForensicPDF = async () => {
    try {
      const { generateForensicAuditPDF } = await import('@/utils/pdf');
      await generateForensicAuditPDF(forensicAuditData, pdfWaqfInfo);
      toast.success('تم تصدير الفحص الجنائي بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تصدير الفحص الجنائي');
    }
  };

  return (
    <>
      <Button onClick={handleDisclosurePDF} variant="outline" className="gap-2">
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">الإفصاح السنوي PDF</span>
      </Button>
      <Button onClick={handleForensicPDF} variant="outline" className="gap-2">
        <ShieldCheck className="w-4 h-4" />
        <span className="hidden sm:inline">الفحص الجنائي PDF</span>
      </Button>
      <ExportMenu onExportPdf={handleExportPDF} />
    </>
  );
};

export default ReportsExportActions;
