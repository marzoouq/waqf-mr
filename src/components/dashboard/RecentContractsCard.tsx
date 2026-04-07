import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { fmt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import { getContractStatusInfo } from '@/utils/contracts';

interface Contract {
  id: string;
  contract_number: string;
  tenant_name: string;
  rent_amount: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface RecentContractsCardProps {
  contracts: Contract[];
  isLoading: boolean;
}

/** هل العقد ينتهي خلال 30 يوماً؟ */
const isExpiringSoon = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return diff > 0 && diff <= 30 * 86_400_000;
};

const RecentContractsCard = ({ contracts, isLoading }: RecentContractsCardProps) => {
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // الاعتماد على ترتيب DB (created_at desc) — بدون إعادة ترتيب client-side
  const displayed = contracts.slice(0, 5);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>آخر العقود</CardTitle>
        <Link to="/dashboard/contracts">
          <Button variant="ghost" size="sm">عرض الكل</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {displayed.map((contract) => {
            const statusInfo = getContractStatusInfo(contract.status);
            const expiring = isExpiringSoon(contract.end_date);
            return (
              <div key={contract.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{contract.tenant_name}</p>
                  <p className="text-xs text-muted-foreground">عقد {contract.contract_number}</p>
                  {expiring && <p className="text-xs text-destructive mt-1">ينتهي قريباً</p>}
                </div>
                <div className="text-left shrink-0">
                  <p className="text-sm font-medium">{fmt(safeNumber(contract.rent_amount))} ر.س</p>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
          {contracts.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد عقود حالياً</p>
          )}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">رقم العقد</TableHead>
                <TableHead className="text-right">المستأجر</TableHead>
                <TableHead className="text-right">قيمة الإيجار</TableHead>
                <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((contract) => {
                const statusInfo = getContractStatusInfo(contract.status);
                const expiring = isExpiringSoon(contract.end_date);
                return (
                  <TableRow key={contract.id}>
                    <TableCell>{contract.contract_number}</TableCell>
                    <TableCell>{contract.tenant_name}</TableCell>
                    <TableCell>{fmt(safeNumber(contract.rent_amount))} ر.س</TableCell>
                    <TableCell className={expiring ? 'text-destructive font-medium' : ''}>
                      {new Date(contract.end_date).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    لا توجد عقود حالياً
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentContractsCard;
