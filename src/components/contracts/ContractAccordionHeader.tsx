/**
 * ترويسة الأكورديون — ملخص العقد الأحدث (مستخرج من ContractAccordionGroup)
 */
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown } from 'lucide-react';
import { fmt } from '@/utils/format';

interface ContractAccordionHeaderProps {
  baseNumber: string;
  tenantName: string;
  propertyNumber: string;
  unitNumber?: string;
  rentAmount: number;
  paid: number;
  paymentCount: number;
  statusLabel: string;
  statusClassName: string;
  versionsCount: number;
}

const ContractAccordionHeader = ({
  baseNumber, tenantName, propertyNumber, unitNumber,
  rentAmount, paid, paymentCount, statusLabel, statusClassName, versionsCount,
}: ContractAccordionHeaderProps) => {
  const hasMultiple = versionsCount > 1;
  const paidColor = paid >= paymentCount ? 'text-success' : paid > 0 ? 'text-warning' : 'text-destructive';
  const barColor = paid >= paymentCount ? '[&>div]:bg-success' : paid >= paymentCount / 2 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';

  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors text-right group"
    >
      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />

      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1 items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm truncate">{baseNumber}</span>
            {hasMultiple && (
              <Badge variant="outline" className="text-[11px] px-1.5 py-0 shrink-0">
                {versionsCount} إصدار
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground truncate">{tenantName}</span>
          <span className="text-sm text-muted-foreground truncate hidden sm:block">
            {propertyNumber || '-'}
            {unitNumber ? ` / و${unitNumber}` : ''}
          </span>
          <span className="text-sm font-medium hidden lg:block">
            {fmt(rentAmount)} ر.س
          </span>
          <div className="hidden lg:flex items-center gap-2">
            <span className={`text-xs font-bold ${paidColor}`}>{paid}/{paymentCount}</span>
            <Progress
              value={paymentCount > 0 ? (paid / paymentCount) * 100 : 0}
              className={`h-1.5 w-16 ${barColor}`}
            />
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium w-fit ${statusClassName}`}>
            {statusLabel}
          </span>
        </div>
        {/* عرض الجوال */}
        <div className="flex items-center gap-3 mt-1.5 lg:hidden text-xs">
          <span className="font-medium text-foreground">{fmt(rentAmount)} ر.س</span>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold ${paidColor}`}>{paid}/{paymentCount}</span>
            <Progress
              value={paymentCount > 0 ? (paid / paymentCount) * 100 : 0}
              className={`h-1 w-12 ${barColor}`}
            />
          </div>
        </div>
      </div>
    </button>
  );
};

export default ContractAccordionHeader;
