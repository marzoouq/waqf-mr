import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import { classifyContractOrigin } from '@/utils/financial/contracts/contractClassification';
import type { Contract } from '@/types';
import { originBadge } from './originBadge';

interface Props {
  contracts: Contract[];
  getPaymentPerPeriod: (c: Contract) => number;
  getExpectedPayments: (c: Contract) => number;
  totalPaymentPerPeriod: number;
  totalAnnualRent: number;
  totalPayments: number;
  statusLabel: (status: string) => string;
  onEditContract: (c: Contract) => void;
  onDeleteContract: (id: string, name: string) => void;
  fiscalYearStartDate: string | null;
  countInYear: number;
  countFromPrevious: number;
}

const AccountsContractsMobileList = ({
  contracts, getPaymentPerPeriod, getExpectedPayments,
  totalPaymentPerPeriod, totalAnnualRent, totalPayments,
  statusLabel, onEditContract, onDeleteContract,
  fiscalYearStartDate, countInYear, countFromPrevious,
}: Props) => {
  const showOrigin = fiscalYearStartDate !== null;

  return (
    <div className="space-y-3 md:hidden">
      {contracts.map((contract) => {
        const origin = showOrigin ? classifyContractOrigin(contract.start_date, fiscalYearStartDate) : 'unknown';
        return (
          <div key={contract.id} className="p-3 rounded-lg border bg-card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{contract.contract_number}</span>
                  <Badge variant="secondary" className="text-xs">{statusLabel(contract.status)}</Badge>
                  {originBadge(origin)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{contract.tenant_name}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditContract(contract)} aria-label="تعديل">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeleteContract(contract.id, `العقد ${contract.contract_number}`)} aria-label="حذف">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-[11px] text-muted-foreground">قيمة الدفعة</p>
                <p className="text-sm font-bold text-primary">{fmt(getPaymentPerPeriod(contract))} ريال</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">عدد الدفعات</p>
                <p className="text-sm font-medium">{getExpectedPayments(contract)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-muted-foreground">الإيجار السنوي</p>
                <p className="text-sm font-bold text-primary">{fmt(safeNumber(contract.rent_amount))} ريال</p>
              </div>
            </div>
          </div>
        );
      })}
      <div className="p-3 bg-muted/50 rounded-lg space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium">عدد العقود</span>
          <span className="font-bold">{contracts.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-medium">إجمالي الدفعات</span>
          <span className="font-bold">{totalPayments} دفعة</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-medium">إجمالي الدفعة</span>
          <span className="font-bold text-primary">{fmt(totalPaymentPerPeriod)} ريال</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-medium">إجمالي الإيجار السنوي</span>
          <span className="font-bold text-primary">{fmt(totalAnnualRent)} ريال</span>
        </div>
        {showOrigin && (
          <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
            <span>تصنيف</span>
            <span>مُرحّل: <span className="font-medium text-foreground">{countFromPrevious}</span> / جديد: <span className="font-medium text-foreground">{countInYear}</span></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AccountsContractsMobileList);
