import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { fmt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';

interface Contract {
  id: string;
  contract_number: string;
  tenant_name: string;
  rent_amount: number;
  status: string;
  start_date: string;
}

interface RecentContractsCardProps {
  contracts: Contract[];
  isLoading: boolean;
}

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

  const sorted = [...contracts]
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 5);

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
          {sorted.map((contract) => (
            <div key={contract.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{contract.tenant_name}</p>
                <p className="text-xs text-muted-foreground">عقد {contract.contract_number}</p>
              </div>
              <div className="text-left shrink-0">
                <p className="text-sm font-medium">{fmt(safeNumber(contract.rent_amount))} ر.س</p>
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                  contract.status === 'active'
                    ? 'bg-success/20 text-success'
                    : 'bg-destructive/20 text-destructive'
                }`}>
                  {contract.status === 'active' ? 'نشط' : 'منتهي'}
                </span>
              </div>
            </div>
          ))}
          {contracts.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد عقود حالياً</p>
          )}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-[400px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">رقم العقد</TableHead>
                <TableHead className="text-right">المستأجر</TableHead>
                <TableHead className="text-right">قيمة الإيجار</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>{contract.contract_number}</TableCell>
                  <TableCell>{contract.tenant_name}</TableCell>
                  <TableCell>{fmt(safeNumber(contract.rent_amount))} ر.س</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      contract.status === 'active'
                        ? 'bg-success/20 text-success'
                        : 'bg-destructive/20 text-destructive'
                    }`}>
                      {contract.status === 'active' ? 'نشط' : 'منتهي'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {contracts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
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
