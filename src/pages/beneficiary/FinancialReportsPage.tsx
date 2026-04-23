/**
 * صفحة التقارير المالية للمستفيد
 */
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { PageHeaderCard, DashboardLayout } from '@/components/layout';
import { ExportMenu, RequirePublishedYears, DashboardSkeleton } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialReportsPage } from '@/hooks/page/beneficiary';

const LazyFinancialCharts = lazy(() => import('@/components/dashboard/charts/FinancialChartsInner'));

const FinancialReportsPage = () => {
  const {
    isLoading, isError, handleRetry,
    isAccountMissing, selectedFY, currentBeneficiary,
    incomeVsExpenses, distributionData, incomePieData, expensesPieData, monthlyData,
    handleDownloadPDF,
  } = useFinancialReportsPage();

  if (isLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isAccountMissing && selectedFY?.status === 'closed') {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold">لم يتم العثور على الحساب الختامي</h2>
          <p className="text-muted-foreground text-center max-w-md">
            لا يوجد حساب ختامي مسجل لهذه السنة المالية بعد.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentBeneficiary && !isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertCircle className="w-16 h-16 text-warning" />
          <h2 className="text-xl font-bold">حسابك غير مرتبط</h2>
          <p className="text-muted-foreground text-center max-w-md">
            حسابك لم يُربط بسجل مستفيد بعد. يرجى التواصل مع ناظر الوقف.
          </p>
        </div>
      </DashboardLayout>
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
