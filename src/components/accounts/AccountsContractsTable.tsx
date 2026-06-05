import { fmt } from '@/utils/format/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import EmptyState from '@/components/common/feedback/EmptyState';
import type { Contract } from '@/types';
import { safeNumber } from '@/utils/format/safeNumber';
import { classifyContractOrigin } from '@/utils/financial/contractClassification';

interface AccountsContractsTableProps {
  contracts: Contract[];
  getPaymentPerPeriod: (contract: Contract) => number;
  getExpectedPayments: (contract: Contract) => number;
  totalPaymentPerPeriod: number;
  totalAnnualRent: number;
  statusLabel: (status: string) => string;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (id: string, name: string) => void;
  /** بداية السنة المالية الحالية. null في وضع "كل السنوات" — يُخفي عمود/شارة "النوع". */
  fiscalYearStartDate?: string | null;
}

const originBadge = (kind: ReturnType<typeof classifyContractOrigin>) => {
  if (kind === 'fromPrevious') return <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/40">مُرحّل</Badge>;
  if (kind === 'inYear') return <Badge variant="secondary" className="text-[10px]">جديد</Badge>;
  return null;
};

const AccountsContractsTable = ({
  contracts, getPaymentPerPeriod, getExpectedPayments,
  totalPaymentPerPeriod, totalAnnualRent, statusLabel,
  onEditContract, onDeleteContract,
  fiscalYearStartDate = null,
}: AccountsContractsTableProps) => {
  const showOrigin = fiscalYearStartDate !== null;
  const totalPayments = contracts.reduce((s, c) => s + getExpectedPayments(c), 0);
  const countInYear = showOrigin
    ? contracts.filter(c => classifyContractOrigin(c.start_date, fiscalYearStartDate) === 'inYear').length
    : 0;
  const countFromPrevious = showOrigin
    ? contracts.filter(c => classifyContractOrigin(c.start_date, fiscalYearStartDate) === 'fromPrevious').length
    : 0;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          العقود
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <EmptyState icon={FileText} title="لا توجد عقود مسجلة" description="أضف عقوداً جديدة من صفحة العقود" compact />
        ) : (
          <>
            {/* Mobile cards */}
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

            {/* Desktop table */}
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

import { memo } from 'react';
export default memo(AccountsContractsTable);
