import { lazy, Suspense } from 'react';
const CashFlowReport = lazy(() => import('@/components/reports/CashFlowReport'));
import OverdueTenantsReport from '@/components/reports/OverdueTenantsReport';
import BalanceSheetReport from '@/components/reports/BalanceSheetReport';
import ZakatEstimationReport from '@/components/reports/ZakatEstimationReport';
import DashboardLayout from '@/components/DashboardLayout';
import { CalendarRange, FileText, TrendingUp, Banknote, Scale, Calculator } from 'lucide-react';
import PageHeaderCard from '@/components/PageHeaderCard';
import { Badge } from '@/components/ui/badge';
const MonthlyPerformanceReport = lazy(() => import('@/components/reports/MonthlyPerformanceReport'));
import { ResponsiveTabs, TabsContent } from '@/components/ui/responsive-tabs';
import AnnualDisclosureTable from '@/components/reports/AnnualDisclosureTable';
import PropertyPerformanceTable from '@/components/reports/PropertyPerformanceTable';
import type { TabItem } from '@/components/ui/responsive-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportsData } from '@/hooks/page/useReportsData';

// مكونات مستخرجة
import ReportsSummaryCards from '@/components/reports/ReportsSummaryCards';
import BeneficiaryDistributionCard from '@/components/reports/BeneficiaryDistributionCard';
import ReportsExportActions from '@/components/reports/ReportsExportActions';

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

  const totalPercentage = beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage ?? 0), 0);

  return (
    <DashboardLayout>
       <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard
          title="التقارير"
          icon={CalendarRange}
          description="عرض التقارير والإحصائيات"
          badge={fiscalYear ? <Badge variant="secondary" className="text-xs">{fiscalYear.label}</Badge> : undefined}
          actions={
            <ReportsExportActions
              currentAccountFY={currentAccount?.fiscal_year || ''}
              fiscalYearLabel={fiscalYear?.label}
              totalIncome={totalIncome} totalExpenses={totalExpenses}
              waqfCorpusPrevious={waqfCorpusPrevious} grandTotal={grandTotal}
              netAfterExpenses={netAfterExpenses} vatAmount={vatAmount}
              netAfterVat={netAfterVat} zakatAmount={zakatAmount}
              netAfterZakat={netAfterZakat} adminShare={adminShare}
              waqifShare={waqifShare} waqfRevenue={waqfRevenue}
              waqfCorpusManual={waqfCorpusManual} availableAmount={availableAmount}
              distributionsAmount={distributionsAmount} remainingBalance={remainingBalance}
              adminPct={adminPct} waqifPct={waqifPct} netRevenue={netRevenue}
              incomeSourceData={incomeSourceData} expenseTypeData={expenseTypeData}
              distributionData={distributionData} forensicAuditData={forensicAuditData}
              pdfWaqfInfo={pdfWaqfInfo}
            />
          }
        />

        <ReportsSummaryCards
          totalIncome={totalIncome} totalExpenses={totalExpenses}
          netRevenue={netRevenue} propertiesCount={properties.length}
          isLoading={isLoading}
        />

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
              incomeSourceData={incomeSourceData} totalIncome={totalIncome}
              grandTotal={grandTotal} expenseTypeData={expenseTypeData}
              vatAmount={vatAmount} totalExpenses={totalExpenses}
              netAfterExpenses={netAfterExpenses} netAfterVat={netAfterVat}
              zakatAmount={zakatAmount} netAfterZakat={netAfterZakat}
              adminPct={adminPct} waqifPct={waqifPct}
              adminShare={adminShare} waqifShare={waqifShare}
              waqfRevenue={waqfRevenue} waqfCorpusManual={waqfCorpusManual}
              availableAmount={availableAmount} distributionsAmount={distributionsAmount}
              remainingBalance={remainingBalance}
            />

            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
              <LazyReportsCharts incomeSourceData={incomeSourceData} expenseTypeData={expenseTypeData} />
            </Suspense>

            <BeneficiaryDistributionCard
              distributionData={distributionData}
              beneficiariesShare={beneficiariesShare}
              totalPercentage={totalPercentage}
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
