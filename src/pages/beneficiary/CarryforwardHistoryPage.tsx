/**
 * صفحة تاريخ الترحيلات والفروق المخصومة من حصة المستفيد
 */
import { DashboardLayout, PageHeaderCard } from '@/components/layout';
import { ExportMenu, DashboardSkeleton, RequirePublishedYears, ErrorState, EmptyPageState } from '@/components/common';
import { Button } from '@/components/ui/button';
import { ArrowDownUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { usePrint } from '@/hooks/ui/usePrint';
import { useNavigate } from 'react-router-dom';

import { useCarryforwardData } from '@/hooks/page/beneficiary/financial/useCarryforwardData';
import { CarryforwardSummaryCards, CarryforwardsRecordTable, PaidAdvancesTable } from '@/components/beneficiary/carryforward';

const CarryforwardHistoryPage = () => {
  const navigate = useNavigate();
  const print = usePrint();
  const {
    beneficiary,
    loadingBen,
    loadingBenFin,
    benError,
    handleRetry,
    carryforwards,
    paidAdvances,
    activeBalance,
    totalPaidAdvances,
    totalSettled,
    fyLabel,
  } = useCarryforwardData();

  if (loadingBen || loadingBenFin) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  // B15: ErrorState الموحّد
  if (benError) {
    return <ErrorState message="حدث خطأ أثناء تحميل البيانات" onRetry={handleRetry} />;
  }

  if (!beneficiary) {
    return <EmptyPageState icon={AlertTriangle} title="لم يتم العثور على بيانات المستفيد" />;
  }

  // N1: RequirePublishedYears يلفّ DashboardLayout بنفسه عند الحجب — لذا يجب أن يكون خارج DashboardLayout لتجنّب layout مزدوج
  return (
    <RequirePublishedYears title="تاريخ الترحيلات والخصومات" icon={ArrowDownUp}>
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-6">
          <PageHeaderCard
            title="تاريخ الترحيلات والخصومات"
            description="سجل تفصيلي للسُلف المصروفة والفروق المرحّلة والمبالغ المخصومة من حصتك"
            icon={ArrowDownUp}
            actions={
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
                  <ArrowRight className="w-4 h-4" />
                  رجوع
                </Button>
                <ExportMenu onExportPdf={print} />
              </div>
            }
          />

          <CarryforwardSummaryCards
            totalPaidAdvances={totalPaidAdvances}
            activeBalance={activeBalance}
            totalSettled={totalSettled}
            paidAdvancesCount={paidAdvances.length}
          />

          <CarryforwardsRecordTable carryforwards={carryforwards} fyLabel={fyLabel} />

          <PaidAdvancesTable paidAdvances={paidAdvances} />
        </div>
      </DashboardLayout>
    </RequirePublishedYears>
  );
};


export default CarryforwardHistoryPage;
