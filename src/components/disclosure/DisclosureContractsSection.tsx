import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { fmt } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';

interface Contract {
  id?: string | null;
  contract_number?: string | null;
  tenant_name?: string | null;
  rent_amount?: number | null;
  status?: string | null;
}

interface Props {
  contracts: Contract[];
  isLoading: boolean;
}

const statusLabel = (s: string | null | undefined) => {
  if (s === 'active') return 'نشط';
  if (s === 'expired') return 'منتهي';
  if (s === 'cancelled') return 'ملغي';
  return s || '';
};

const DisclosureContractsSection = ({ contracts, isLoading }: Props) => {
  const activeContracts = contracts.filter(c => c.status === 'active');
  const totalRent = activeContracts.reduce((s, c) => s + safeNumber(c.rent_amount), 0);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          العقود
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : contracts.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">لا توجد عقود مسجلة</p>
        ) : (
          <>
            {/* Mobile */}
            <div className="space-y-3 md:hidden">
              {contracts.map((c, i) => (
                <div key={c.id || i} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{c.contract_number}</span>
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{statusLabel(c.status)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.tenant_name}</p>
                  <div className="flex justify-between text-xs">
                    <span>سنوي: {fmt(safeNumber(c.rent_amount))} ر.س</span>
                    <span>شهري: {fmt(Math.round(safeNumber(c.rent_amount) / 12), 0)} ر.س</span>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-primary/10 font-bold text-sm flex justify-between">
                <span>الإجمالي</span>
                <span>{fmt(totalRent)} ر.س</span>
              </div>
            </div>
            {/* Desktop */}
            <div className="overflow-x-auto hidden md:block">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">رقم العقد</TableHead>
                    <TableHead className="text-right">المستأجر</TableHead>
                    <TableHead className="text-right">الإيجار السنوي</TableHead>
                    <TableHead className="text-right">الإيجار الشهري</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c, i) => (
                    <TableRow key={c.id || i}>
                      <TableCell className="font-medium">{c.contract_number}</TableCell>
                      <TableCell>{c.tenant_name}</TableCell>
                      <TableCell>{fmt(safeNumber(c.rent_amount))} ر.س</TableCell>
                      <TableCell>{fmt(Math.round(safeNumber(c.rent_amount) / 12), 0)} ر.س</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{statusLabel(c.status)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={2}>الإجمالي</TableCell>
                    <TableCell>{fmt(totalRent)} ر.س</TableCell>
                    <TableCell>{fmt(Math.round(totalRent / 12), 0)} ر.س</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DisclosureContractsSection;
