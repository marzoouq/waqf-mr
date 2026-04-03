/**
 * جدول سطح المكتب لعرض العقود — المستفيد
 */
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format';

interface ContractItem {
  id: string | null;
  contract_number: string | null;
  tenant_name: string | null;
  property_id: string | null;
  rent_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  expired: { label: 'منتهي', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'secondary' },
};

interface ContractsViewDesktopTableProps {
  contracts: ContractItem[];
  propertiesMap: Record<string, string>;
  isExpiringSoon: (c: { status: string | null; end_date: string | null }) => boolean;
}

export default function ContractsViewDesktopTable({ contracts, propertiesMap, isExpiringSoon }: ContractsViewDesktopTableProps) {
  return (
    <Card className="hidden md:block">
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">رقم العقد</TableHead>
              <TableHead className="text-right">المستأجر</TableHead>
              <TableHead className="text-right">العقار</TableHead>
              <TableHead className="text-right">قيمة الإيجار</TableHead>
              <TableHead className="text-right">تاريخ البداية</TableHead>
              <TableHead className="text-right">تاريخ النهاية</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map(contract => {
              const st = STATUS_MAP[contract.status ?? ''] || { label: contract.status ?? '', variant: 'outline' as const };
              return (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.contract_number ?? ''}</TableCell>
                  <TableCell>{contract.tenant_name ?? ''}</TableCell>
                  <TableCell>{(contract.property_id && propertiesMap[contract.property_id]) || '-'}</TableCell>
                  <TableCell>{fmt(contract.rent_amount ?? 0)} ر.س</TableCell>
                  <TableCell>{fmtDate(contract.start_date ?? '')}</TableCell>
                  <TableCell>{fmtDate(contract.end_date ?? '')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {isExpiringSoon(contract) && (
                        <Badge variant="outline" className="text-warning border-warning text-[11px]">
                          <AlertTriangle className="w-3 h-3 ml-1" />قريب
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
