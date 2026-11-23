import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import { getEffectiveContractStatus } from '@/utils/contracts/contractStatus';
import InfoHint from './InfoHint';

interface Contract {
  id?: string | null;
  contract_number?: string | null;
  tenant_name?: string | null;
  rent_amount?: number | null;
  status?: string | null;
  end_date?: string | null;
}

interface Props {
  contracts: Contract[];
  isLoading: boolean;
  isClosed?: boolean;
}

const statusLabel = (s: string | null | undefined) => {
  if (s === 'active') return 'نشط';
  if (s === 'expired') return 'منتهي';
  if (s === 'cancelled') return 'ملغي';
  return s || '';
};

export const CONTRACTS_TOTAL_HINT = 'القيمة التعاقدية الكاملة للعقود، وقد يخص جزء منها سنوات قادمة أو أقساطاً مرحّلة، لذا قد تختلف عن إجمالي الإيرادات.';

const DisclosureContractsSection = ({ contracts, isLoading, isClosed = false }: Props) => {
  // السنوات غير المقفلة فقط: مسمى أوضح مع شرح عند اللمس
  const totalLabel = isClosed ? 'الإجمالي' : 'إجمالي القيمة السنوية للعقود';
  const totalHint = isClosed ? null : <InfoHint label="شرح الإجمالي" text={CONTRACTS_TOTAL_HINT} />;
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
                    <Badge variant={getEffectiveContractStatus(c.status, c.end_date) === 'active' ? 'default' : 'secondary'}>{statusLabel(getEffectiveContractStatus(c.status, c.end_date))}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.tenant_name}</p>
                  <div className="flex justify-between text-xs">
                    <span>سنوي: {fmt(safeNumber(c.rent_amount))} ر.س</span>
                    <span>شهري: {fmt(Math.round(safeNumber(c.rent_amount) / 12), 0)} ر.س</span>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-primary/10 font-bold text-sm flex justify-between">
                <span className="flex items-center gap-1">{totalLabel}{totalHint}</span>
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
                        <Badge variant={getEffectiveContractStatus(c.status, c.end_date) === 'active' ? 'default' : 'secondary'}>{statusLabel(getEffectiveContractStatus(c.status, c.end_date))}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={2}><span className="flex items-center gap-1">{totalLabel}{totalHint}</span></TableCell>
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
