/**
 * جدول توزيع الحصص على المستفيدين — مستخرج من ReportsPage
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { fmt } from '@/utils/format/format';
import { formatPercentage } from '@/utils/format';

interface DistributionItem {
  name: string | null;
  percentage: number | null;
  amount: number;
}

interface BeneficiaryDistributionTableProps {
  distributionData: DistributionItem[];
  beneficiariesShare: number;
  totalPercentage: number;
}

const BeneficiaryDistributionTable = ({
  distributionData, beneficiariesShare, totalPercentage,
}: BeneficiaryDistributionTableProps) => (
  <Card className="shadow-sm print:break-before-page">
    <CardHeader><CardTitle>توزيع الحصص على المستفيدين</CardTitle></CardHeader>
    <CardContent>
      {distributionData.length > 0 ? (
        <>
          <div className="space-y-2 md:hidden">
            {distributionData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPercentage(item.percentage ?? 0)}</p>
                </div>
                <span className="text-primary font-bold text-sm">{fmt(item.amount)} ر.س</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border font-bold">
              <span>الإجمالي</span>
              <span className="text-primary">{fmt(beneficiariesShare)} ر.س</span>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">المستفيد</TableHead>
                  <TableHead className="text-right">النسبة</TableHead>
                  <TableHead className="text-right">المبلغ المستحق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributionData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{formatPercentage(item.percentage ?? 0)}</TableCell>
                    <TableCell className="text-primary font-medium">{fmt(item.amount)} ر.س</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>الإجمالي</TableCell>
                  <TableCell>{formatPercentage(totalPercentage)}</TableCell>
                  <TableCell className="text-primary">{fmt(beneficiariesShare)} ر.س</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="py-12 text-center text-muted-foreground">لا يوجد مستفيدين مسجلين</div>
      )}
    </CardContent>
  </Card>
);

export default BeneficiaryDistributionTable;
