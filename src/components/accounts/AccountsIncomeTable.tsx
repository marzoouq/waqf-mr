import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TrendingUp } from 'lucide-react';

interface AccountsIncomeTableProps {
  incomeCount: number;
  incomeBySource: Record<string, number>;
  totalIncome: number;
}

const AccountsIncomeTable = ({ incomeCount, incomeBySource, totalIncome }: AccountsIncomeTableProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          تفصيل الإيرادات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {incomeCount === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد إيرادات مسجلة</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">المصدر</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(incomeBySource).map(([source, amount]) => (
                  <TableRow key={source}>
                    <TableCell className="font-medium">{source}</TableCell>
                    <TableCell className="text-success">+{amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
              <span className="font-medium">إجمالي الإيرادات</span>
              <span className="font-bold text-success">+{totalIncome.toLocaleString()} ريال</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsIncomeTable;
