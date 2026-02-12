import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import type { Contract } from '@/types/database';

interface AccountsContractsTableProps {
  contracts: Contract[];
  getPaymentPerPeriod: (contract: Contract) => number;
  getExpectedPayments: (contract: Contract) => number;
  totalPaymentPerPeriod: number;
  totalAnnualRent: number;
  statusLabel: (status: string) => string;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (id: string, name: string) => void;
}

const AccountsContractsTable = ({
  contracts, getPaymentPerPeriod, getExpectedPayments,
  totalPaymentPerPeriod, totalAnnualRent, statusLabel,
  onEditContract, onDeleteContract,
}: AccountsContractsTableProps) => {
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
          <p className="text-center text-muted-foreground py-8">لا توجد عقود مسجلة</p>
        ) : (
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right w-12">#</TableHead>
                <TableHead className="text-right">رقم العقد</TableHead>
                <TableHead className="text-right">المستأجر</TableHead>
                <TableHead className="text-right">قيمة الدفعة</TableHead>
                <TableHead className="text-right">عدد الدفعات</TableHead>
                <TableHead className="text-right">الإيجار السنوي</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right w-20">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract, index) => (
                <TableRow key={contract.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{contract.contract_number}</TableCell>
                  <TableCell>{contract.tenant_name}</TableCell>
                  <TableCell className="font-bold text-primary">{getPaymentPerPeriod(contract).toLocaleString()} ريال</TableCell>
                  <TableCell className="text-center">{getExpectedPayments(contract)}</TableCell>
                  <TableCell className="font-bold text-primary">{Number(contract.rent_amount).toLocaleString()} ريال</TableCell>
                  <TableCell>{statusLabel(contract.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditContract(contract)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteContract(contract.id, `العقد ${contract.contract_number}`)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/70 font-bold">
                <TableCell>الإجمالي</TableCell>
                <TableCell></TableCell>
                <TableCell>{contracts.length} عقد</TableCell>
                <TableCell className="text-primary font-bold">{totalPaymentPerPeriod.toLocaleString()} ريال</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-primary font-bold">{totalAnnualRent.toLocaleString()} ريال</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsContractsTable;
