import { fmt } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Wallet, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { safeNumber } from '@/utils/safeNumber';

interface Account {
  id: string;
  fiscal_year: string;
  total_income: number;
  total_expenses: number;
  admin_share: number;
  waqif_share: number;
  waqf_revenue: number;
}

interface AccountsSavedTableProps {
  accounts: Account[];
  isLoading: boolean;
  onDeleteAccount: (id: string, name: string) => void;
}

const AccountsSavedTable = ({ accounts, isLoading, onDeleteAccount }: AccountsSavedTableProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>السجلات السابقة</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد حسابات ختامية مسجلة</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {accounts.map((account) => (
                <div key={account.id} className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{account.fiscal_year}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeleteAccount(account.id, `حساب ${account.fiscal_year}`)} aria-label="حذف">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">إجمالي الدخل</p>
                      <p className="text-sm font-bold text-success">+{fmt(safeNumber(account.total_income))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">إجمالي المصروفات</p>
                      <p className="text-sm font-bold text-destructive">-{fmt(safeNumber(account.total_expenses))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">حصة الناظر</p>
                      <p className="text-sm font-medium">{fmt(safeNumber(account.admin_share))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">ريع الوقف</p>
                      <p className="text-sm font-bold text-primary">{fmt(safeNumber(account.waqf_revenue))}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">السنة المالية</TableHead>
                    <TableHead className="text-right">إجمالي الدخل</TableHead>
                    <TableHead className="text-right">إجمالي المصروفات</TableHead>
                    <TableHead className="text-right">حصة الناظر</TableHead>
                    <TableHead className="text-right">حصة الواقف</TableHead>
                    <TableHead className="text-right">ريع الوقف</TableHead>
                    <TableHead className="text-right w-20">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.fiscal_year}</TableCell>
                      <TableCell className="text-success">+{fmt(safeNumber(account.total_income))}</TableCell>
                      <TableCell className="text-destructive">-{fmt(safeNumber(account.total_expenses))}</TableCell>
                      <TableCell>{fmt(safeNumber(account.admin_share))}</TableCell>
                      <TableCell>{fmt(safeNumber(account.waqif_share))}</TableCell>
                      <TableCell className="text-primary font-medium">{fmt(safeNumber(account.waqf_revenue))}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteAccount(account.id, `حساب ${account.fiscal_year}`)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsSavedTable;
