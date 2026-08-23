import { memo } from 'react';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import { classifyContractOrigin } from '@/utils/financial/contracts/contractClassification';
import { originBadge } from './originBadge';
import type { AccountsContractsViewProps } from './accountsContractsTypes';


const AccountsContractsDesktopTable = ({
  contracts, getPaymentPerPeriod, getExpectedPayments,
  totalPaymentPerPeriod, totalAnnualRent, totalPayments,
  statusLabel, onEditContract, onDeleteContract,
  fiscalYearStartDate, countInYear, countFromPrevious,
}: AccountsContractsViewProps) => {
  const showOrigin = fiscalYearStartDate !== null;

  return (
    <div className="hidden md:block">
      <Table className="min-w-[820px]">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-right w-12">#</TableHead>
            <TableHead className="text-right">رقم العقد</TableHead>
            <TableHead className="text-right">المستأجر</TableHead>
            <TableHead className="text-right">قيمة الدفعة</TableHead>
            <TableHead className="text-right">عدد الدفعات</TableHead>
            <TableHead className="text-right">الإيجار السنوي</TableHead>
            {showOrigin && <TableHead className="text-right">النوع</TableHead>}
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right w-20">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract, index) => {
            const origin = showOrigin ? classifyContractOrigin(contract.start_date, fiscalYearStartDate) : 'unknown';
            return (
              <TableRow key={contract.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{contract.contract_number}</TableCell>
                <TableCell>{contract.tenant_name}</TableCell>
                <TableCell className="font-bold text-primary">{fmt(getPaymentPerPeriod(contract))} ريال</TableCell>
                <TableCell className="text-center">{getExpectedPayments(contract)}</TableCell>
                <TableCell className="font-bold text-primary">{fmt(safeNumber(contract.rent_amount))} ريال</TableCell>
                {showOrigin && <TableCell>{originBadge(origin)}</TableCell>}
                <TableCell>{statusLabel(contract.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditContract(contract)} aria-label="تعديل العقد">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteContract(contract.id, `العقد ${contract.contract_number}`)} aria-label="حذف العقد">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-muted/70 font-bold">
            <TableCell>الإجمالي</TableCell>
            <TableCell></TableCell>
            <TableCell>{contracts.length} عقد</TableCell>
            <TableCell className="text-primary font-bold">{fmt(totalPaymentPerPeriod)} ريال</TableCell>
            <TableCell className="text-center font-bold">{totalPayments} دفعة</TableCell>
            <TableCell className="text-primary font-bold">{fmt(totalAnnualRent)} ريال</TableCell>
            {showOrigin && <TableCell className="text-xs text-muted-foreground">مُرحّل: {countFromPrevious} / جديد: {countInYear}</TableCell>}
            <TableCell></TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default memo(AccountsContractsDesktopTable);
