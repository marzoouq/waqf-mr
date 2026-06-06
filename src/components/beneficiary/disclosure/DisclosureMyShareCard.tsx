import { fmt } from '@/utils/format/format';

interface Props {
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  currentBeneficiaryName: string;
  currentBeneficiaryPct: number;
}

const DisclosureMyShareCard = ({
  myShare, totalReceived, pendingAmount,
  currentBeneficiaryName, currentBeneficiaryPct,
}: Props) => (
  <div className="bg-primary/10 rounded-xl p-4 sm:p-6 mt-4 space-y-4">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <p className="text-xs sm:text-sm text-muted-foreground">حصتي المستحقة ({currentBeneficiaryPct}%)</p>
        <p className="font-bold text-xl sm:text-2xl text-primary">{fmt(myShare)} ر.س</p>
      </div>
      <div className="sm:text-end">
        <p className="text-xs sm:text-sm text-muted-foreground">الاسم</p>
        <p className="font-bold text-sm sm:text-base">{currentBeneficiaryName || 'غير مرتبط'}</p>
      </div>
    </div>
    {(totalReceived > 0 || pendingAmount > 0) && (
      <div className="border-t border-primary/20 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">المبلغ المستلم</p>
          <p className="font-bold text-base sm:text-lg text-success">{fmt(totalReceived)} ر.س</p>
        </div>
        {pendingAmount > 0 && (
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">مبلغ معلق</p>
            <p className="font-bold text-base sm:text-lg text-warning">{fmt(pendingAmount)} ر.س</p>
          </div>
        )}
      </div>
    )}
  </div>
);

export default DisclosureMyShareCard;
