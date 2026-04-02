/**
 * صفحة تاريخ الترحيلات والفروق المخصومة من حصة المستفيد
 */
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardSkeleton } from '@/components/common/SkeletonLoaders';
import PageHeaderCard from '@/components/layout/PageHeaderCard';
import ExportMenu from '@/components/common/ExportMenu';
import { Button } from '@/components/ui/button';
import { ArrowDownUp, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { useCarryforwardData } from '@/hooks/page/useCarryforwardData';
import CarryforwardSummaryCards from './carryforward/CarryforwardSummaryCards';
import CarryforwardsRecordTable from './carryforward/CarryforwardsRecordTable';
import PaidAdvancesTable from './carryforward/PaidAdvancesTable';

const CarryforwardHistoryPage = () => {
  const navigate = useNavigate();
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

  if (benError) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <AlertTriangle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ أثناء تحميل البيانات</h2>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!beneficiary) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لم يتم العثور على بيانات المستفيد</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
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
              <ExportMenu onExportPdf={() => {
                toast.info('جاري تجهيز الطباعة...');
                setTimeout(() => { window.print(); }, 300);
              }} />
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
  );
};

export default CarryforwardHistoryPage;
