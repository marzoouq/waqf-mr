import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Users } from 'lucide-react';
import { formatPercentage } from '@/lib/utils';

interface Beneficiary {
  id: string;
  name: string;
  share_percentage: number;
}

interface AccountsBeneficiariesTableProps {
  beneficiaries: Beneficiary[];
  manualDistributions: number;
  totalBeneficiaryPercentage: number;
}

const AccountsBeneficiariesTable = ({
  beneficiaries, manualDistributions, totalBeneficiaryPercentage,
}: AccountsBeneficiariesTableProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          توزيع حصص المستفيدين
        </CardTitle>
      </CardHeader>
      <CardContent>
        {beneficiaries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا يوجد مستفيدون مسجلون</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right">المستفيد</TableHead>
                  <TableHead className="text-right">النسبة</TableHead>
                  <TableHead className="text-right">المبلغ المستحق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beneficiaries.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{formatPercentage(b.share_percentage)}</TableCell>
                    <TableCell className="text-primary font-medium">
                      {(totalBeneficiaryPercentage > 0
                        ? manualDistributions * Number(b.share_percentage) / totalBeneficiaryPercentage
                        : 0
                      ).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
              <span className="font-medium">إجمالي التوزيع</span>
              <span className="font-bold text-primary">
                {manualDistributions.toLocaleString()} ريال
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsBeneficiariesTable;
