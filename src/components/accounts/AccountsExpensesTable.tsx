import { fmt } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TrendingDown } from 'lucide-react';

interface AccountsExpensesTableProps {
  expensesCount: number;
  expensesByType: Record<string, number>;
  totalExpenses: number;
}

const AccountsExpensesTable = ({ expensesCount, expensesByType, totalExpenses }: AccountsExpensesTableProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          تفصيل المصروفات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expensesCount === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد مصروفات مسجلة</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {Object.entries(expensesByType).map(([type, amount]) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <span className="text-sm font-medium">{type}</span>
                  <span className="text-sm font-bold text-destructive">-{fmt(amount)}</span>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table className="min-w-[350px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(expensesByType).map(([type, amount]) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">{type}</TableCell>
                      <TableCell className="text-destructive">-{fmt(amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
              <span className="font-medium">إجمالي المصروفات</span>
              <span className="font-bold text-destructive">-{fmt(totalExpenses)} ريال</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsExpensesTable;
