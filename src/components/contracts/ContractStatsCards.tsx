/**
 * بطاقات أرقام العقود (الهوية الوقفية) — نفس الأرقام القادمة من الصفحة دون أي حساب.
 */
import { fmt } from '@/utils/format/format';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { FigureTile } from '@/components/common';

interface ContractStats {
  total: number;
  active: number;
  activePercent: number;
  expired: number;
  /** الإيرادات: إن كانت السنة محددة وتوجد تخصيصات تكون = Σ allocated_amount، وإلا = Σ rent_amount */
  totalRent: number;
  activeRent: number;
  expiringSoon: number;
}

interface ContractStatsCardsProps {
  stats: ContractStats;
  isLoading: boolean;
  /** 'admin' = جميع البطاقات (5)، 'beneficiary' = الإجمالي والنشطة فقط (2) — لا أرقام إيرادات */
  variant?: 'admin' | 'beneficiary';
  /** مصدر حساب الإيراد: 'allocated' = حصة السنة من العقود (allocated_amount) | 'rent' = إجمالي قيمة العقد (rent_amount) */
  revenueSource?: 'allocated' | 'rent';
}

const ContractStatsCards = ({ stats, isLoading, variant = 'admin', revenueSource = 'rent' }: ContractStatsCardsProps) => {
  const revenueLabel = revenueSource === 'allocated' ? 'حصة السنة من العقود' : 'إجمالي قيمة العقود';
  const revenueTitle = revenueSource === 'allocated'
    ? 'مجموع المخصّص للسنة المالية من قيم العقود (allocated_amount)'
    : 'مجموع قيم العقود الكاملة (rent_amount) — قد يشمل سنوات متعددة';
  const isBeneficiary = variant === 'beneficiary';
  const gridCols = isBeneficiary ? 'sm:grid-cols-2' : 'sm:grid-cols-3 lg:grid-cols-5';

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 ${gridCols} gap-3 sm:gap-4`}>
        {Array.from({ length: isBeneficiary ? 2 : 5 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 ${gridCols} gap-3 sm:gap-4`}>
      {!isBeneficiary && (
        <FigureTile
          label="الإيرادات التعاقدية" value={stats.totalRent} icon={DollarSign} tone="income" title={revenueTitle}
          hint={<>{revenueLabel} · نشط: <bdi dir="ltr" className="num">{fmt(stats.activeRent)}</bdi></>}
          className="col-span-2 sm:col-span-3 lg:col-span-1"
        />
      )}
      <FigureTile label="إجمالي العقود" value={stats.total} icon={FileText} tone="neutral" unit="count" />
      <FigureTile label="العقود النشطة" value={stats.active} icon={CheckCircle} tone="success" unit="count" hint={<bdi dir="ltr" className="num">{stats.activePercent}%</bdi>} />
      {!isBeneficiary && <FigureTile label="العقود المنتهية" value={stats.expired} icon={XCircle} tone="expense" unit="count" />}
      {!isBeneficiary && (
        <FigureTile label="تنتهي خلال 3 أشهر" value={stats.expiringSoon} icon={AlertTriangle} tone={stats.expiringSoon > 0 ? 'warning' : 'neutral'} unit="count" />
      )}
    </div>
  );
};

export default ContractStatsCards;
