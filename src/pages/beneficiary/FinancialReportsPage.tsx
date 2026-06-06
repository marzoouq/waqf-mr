/**
 * صفحة التقارير المالية للمستفيد
 */
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { PageHeaderCard, DashboardLayout } from '@/components/layout';
import { ExportMenu, RequirePublishedYears, DashboardSkeleton, ErrorState } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import UnlinkedAccountNotice from '@/components/beneficiary/UnlinkedAccountNotice';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialReportsPage } from '@/hooks/page/beneficiary';

const LazyFinancialCharts = lazy(() => import('@/components/dashboard/charts/FinancialChartsInner'));

const FinancialReportsPage = () => {
  const { noPublishedYears } = useFiscalYear();
  const {
    isLoading, isError, handleRetry,
    isAccountMissing, selectedFY, currentBeneficiary,
    incomeVsExpenses, distributionData, incomePieData, expensesPieData, monthlyData,
    handleDownloadPDF,
  } = useFinancialReportsPage();

  // B2: حارس السنوات المنشورة قبل أي فرع
  if (noPublishedYears) {
    return <RequirePublishedYears title="التقارير المالية" icon={BarChart3}><></></RequirePublishedYears>;
  }

  if (isLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  // B12: ErrorState الموحّد
  if (isError) {
    return <ErrorState onRetry={handleRetry} />;
  }

  // H3: تحقّق من ربط المستفيد قبل رسالة "الحساب الختامي مفقود"
  if (!currentBeneficiary) {
    return <UnlinkedAccountNotice />;
  }

  if (isAccountMissing && selectedFY?.status === 'closed') {
    return (
      <ErrorState
        variant="warning"
        message="لم يتم العثور على الحساب الختامي"
        description="لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد."
      />
    );
  }



  return (
    <RequirePublishedYears title="التقارير المالية" icon={BarChart3}>
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        <PageHeaderCard title="التقارير المالية" icon={BarChart3} description="عرض وتحليل البيانات المالية للوقف" actions={
          <ExportMenu onExportPdf={handleDownloadPDF} />
        } />

        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 text-center">
          التحليل البياني للبيانات المالية — للأرقام التفصيلية راجع{' '}
          <Link to="/beneficiary/disclosure" className="text-sm text-primary hover:underline px-1">
            صفحة الإفصاح السنوي
          </Link>
        </p>

        <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-lg" />}>
          <LazyFinancialCharts
            incomeVsExpenses={incomeVsExpenses}
            distributionData={distributionData}
            incomePieData={incomePieData}
            expensesPieData={expensesPieData}
            monthlyData={monthlyData}
          />
        </Suspense>
      </div>
    </DashboardLayout>
    </RequirePublishedYears>
  );
};

export default FinancialReportsPage;
