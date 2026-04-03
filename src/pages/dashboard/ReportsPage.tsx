import { fmt } from '@/utils/format';
import { lazy, Suspense } from 'react';
const CashFlowReport = lazy(() => import('@/components/reports/CashFlowReport'));
import { OverdueTenantsReport, BalanceSheetReport, ZakatEstimationReport, BeneficiaryDistributionTable, AnnualDisclosureTable, PropertyPerformanceTable } from '@/components/reports';
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarRange, FileText, TrendingUp, ShieldCheck, Banknote, Scale, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
const MonthlyPerformanceReport = lazy(() => import('@/components/reports/MonthlyPerformanceReport'));
import { ExportMenu } from '@/components/common';
import BeneficiaryDistributionTable from '@/components/reports/BeneficiaryDistributionTable';
import { ResponsiveTabs, TabsContent } from '@/components/ui/responsive-tabs';
import AnnualDisclosureTable from '@/components/reports/AnnualDisclosureTable';
import PropertyPerformanceTable from '@/components/reports/PropertyPerformanceTable';
import type { TabItem } from '@/components/ui/responsive-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportsData } from '@/hooks/page/useReportsData';

const LazyReportsCharts = lazy(() => import('@/components/reports/ReportsChartsInner'));

const ReportsPage = () => {
  const {
    pdfWaqfInfo, fiscalYear,
    properties, contracts, paymentInvoices,
    income, expenses, beneficiaries, currentAccount,
    totalIncome, totalExpenses, adminPct, waqifPct,
    zakatAmount, vatAmount, waqfCorpusPrevious, waqfCorpusManual, distributionsAmount,
    grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
    adminShare, waqifShare, waqfRevenue,
    availableAmount, remainingBalance, beneficiariesShare,
    netRevenue, incomeSourceData, expenseTypeData, distributionData,
    propertyPerformance, perfTotals,
    forensicAuditData, isLoading,
  } = useReportsData();

  const handleExportPDF = async () => {
    const { generateAnnualReportPDF } = await import('@/utils/pdf');
    await generateAnnualReportPDF({
      fiscalYear: currentAccount?.fiscal_year || fiscalYear?.label || '',
      totalIncome,
      totalExpenses,
      netRevenue,
      adminShare,
      waqifShare,
      waqfRevenue,
      expensesByType: expenseTypeData.map(d => ({ type: d.name, amount: d.value })),
      incomeBySource: incomeSourceData.map(d => ({ source: d.name, amount: d.value })),
      beneficiaries: distributionData.map(d => ({
        name: d.name ?? 'غير معروف',
        percentage: d.percentage ?? 0,
        amount: d.amount,
      })),
    }, pdfWaqfInfo);
  };

  return (
    <DashboardLayout>
       <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="التقارير"
          icon={CalendarRange}
          description="عرض التقارير والإحصائيات"
          badge={fiscalYear ? <Badge variant="secondary" className="text-xs">{fiscalYear.label}</Badge> : undefined}
          actions={<>
            <Button onClick={async () => {
              const { generateAnnualDisclosurePDF } = await import('@/utils/pdf');
              await generateAnnualDisclosurePDF({
                fiscalYear: currentAccount?.fiscal_year || fiscalYear?.label || '',
                totalIncome, totalExpenses, waqfCorpusPrevious, grandTotal,
                netAfterExpenses, vatAmount, netAfterVat, zakatAmount, netAfterZakat,
                adminShare, waqifShare, waqfRevenue, waqfCorpusManual,
                availableAmount, distributionsAmount, remainingBalance,
                incomeBySource: Object.fromEntries(incomeSourceData.map(d => [d.name, d.value])),
                expensesByType: Object.fromEntries(expenseTypeData.map(d => [d.name, d.value])),
                beneficiaries: distributionData.map(d => ({
                  name: d.name ?? 'غير معروف',
                  share_percentage: d.percentage ?? 0,
                  amount: d.amount,
                })),
                adminPct, waqifPct,
              }, pdfWaqfInfo);
            }} variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">الإفصاح السنوي PDF</span>
            </Button>
            <Button onClick={async () => {
              try {
                const { generateForensicAuditPDF } = await import('@/utils/pdf');
                await generateForensicAuditPDF(forensicAuditData, pdfWaqfInfo);
                toast.success('تم تصدير الفحص الجنائي بنجاح');
              } catch {
                toast.error('حدث خطأ أثناء تصدير الفحص الجنائي');
              }
            }} variant="outline" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">الفحص الجنائي PDF</span>
            </Button>
            <ExportMenu onExportPdf={handleExportPDF} />
          </>}
        />

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm"><CardContent className="p-3 sm:p-4 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-32" /></CardContent></Card>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-sm"><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">إجمالي الدخل</p><p className="text-lg sm:text-2xl font-bold text-success tabular-nums truncate">{fmt(totalIncome)} ر.س</p></CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">إجمالي المصروفات</p><p className="text-lg sm:text-2xl font-bold text-destructive tabular-nums truncate">{fmt(totalExpenses)} ر.س</p></CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">صافي الريع</p><p className="text-lg sm:text-2xl font-bold text-primary tabular-nums truncate">{fmt(netRevenue)} ر.س</p></CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">عدد العقارات</p><p className="text-lg sm:text-2xl font-bold tabular-nums">{properties.length}</p></CardContent></Card>
        </div>
        )}

        <ResponsiveTabs
          defaultValue="financial"
          items={[
            { value: 'financial', label: 'التقارير المالية', icon: <FileText className="w-4 h-4" /> },
            { value: 'performance', label: 'مقارنة أداء العقارات', icon: <TrendingUp className="w-4 h-4" /> },
            { value: 'monthly', label: 'الأداء الشهري', icon: <CalendarRange className="w-4 h-4" /> },
            { value: 'cashflow', label: 'التدفق النقدي', icon: <Banknote className="w-4 h-4" /> },
            { value: 'balance', label: 'الميزانية العمومية', icon: <Scale className="w-4 h-4" /> },
            { value: 'overdue', label: 'المتأخرون', icon: <FileText className="w-4 h-4" /> },
            { value: 'zakat', label: 'تقدير الزكاة', icon: <Calculator className="w-4 h-4" /> },
          ] satisfies TabItem[]}
        >
          <TabsContent value="financial" className="space-y-6">
            <AnnualDisclosureTable
              fiscalYearLabel={currentAccount?.fiscal_year || fiscalYear?.label || ''}
              waqfCorpusPrevious={waqfCorpusPrevious}
              incomeSourceData={incomeSourceData}
              totalIncome={totalIncome}
              grandTotal={grandTotal}
              expenseTypeData={expenseTypeData}
              vatAmount={vatAmount}
              totalExpenses={totalExpenses}
              netAfterExpenses={netAfterExpenses}
              netAfterVat={netAfterVat}
              zakatAmount={zakatAmount}
              netAfterZakat={netAfterZakat}
              adminPct={adminPct}
              waqifPct={waqifPct}
              adminShare={adminShare}
              waqifShare={waqifShare}
              waqfRevenue={waqfRevenue}
              waqfCorpusManual={waqfCorpusManual}
              availableAmount={availableAmount}
              distributionsAmount={distributionsAmount}
              remainingBalance={remainingBalance}
            />

            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
              <LazyReportsCharts incomeSourceData={incomeSourceData} expenseTypeData={expenseTypeData} />
            </Suspense>

            <BeneficiaryDistributionTable
              distributionData={distributionData}
              beneficiariesShare={beneficiariesShare}
              totalPercentage={beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage ?? 0), 0)}
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PropertyPerformanceTable propertyPerformance={propertyPerformance} perfTotals={perfTotals} />
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <Suspense fallback={null}>
              <MonthlyPerformanceReport income={income} expenses={expenses} fiscalYear={currentAccount?.fiscal_year} />
            </Suspense>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            <Suspense fallback={null}>
              <CashFlowReport income={income} expenses={expenses} fiscalYear={fiscalYear} />
            </Suspense>
          </TabsContent>

          <TabsContent value="balance" className="space-y-6">
            <BalanceSheetReport
              totalIncome={totalIncome} totalExpenses={totalExpenses} vatAmount={vatAmount}
              zakatAmount={zakatAmount} adminShare={adminShare} waqifShare={waqifShare}
              waqfRevenue={waqfRevenue} waqfCorpusPrevious={waqfCorpusPrevious}
              waqfCorpusManual={waqfCorpusManual} distributionsAmount={distributionsAmount}
              availableAmount={availableAmount} grandTotal={grandTotal}
              netAfterExpenses={netAfterExpenses} netAfterVat={netAfterVat}
              netAfterZakat={netAfterZakat} fiscalYearLabel={fiscalYear?.label}
            />
          </TabsContent>

          <TabsContent value="overdue" className="space-y-6">
            <OverdueTenantsReport contracts={contracts} paymentInvoices={paymentInvoices} properties={properties} />
          </TabsContent>

          <TabsContent value="zakat" className="space-y-6">
            <ZakatEstimationReport
              totalIncome={totalIncome} totalExpenses={totalExpenses} vatAmount={vatAmount}
              netAfterVat={netAfterVat} zakatAmount={zakatAmount} netAfterZakat={netAfterZakat}
              waqfCorpusPrevious={waqfCorpusPrevious} grandTotal={grandTotal}
              fiscalYearLabel={fiscalYear?.label}
            />
          </TabsContent>
        </ResponsiveTabs>
      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;
