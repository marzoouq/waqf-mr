import { EmptyState } from '@/components/common';
import { fmt } from '@/utils/format/format';
import { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, Banknote } from 'lucide-react';

import { formatPercentage } from '@/utils/format';
import DistributeDialog from './DistributeDialog';
import { isFyAll } from '@/constants/fiscalYearIds';
import { computeDistributionBase, isPercentageTotalOff, shareOf } from '@/utils/financial/distribution/distributionBase';

interface Beneficiary {
  id: string;
  name: string;
  share_percentage: number;
}

interface AccountsBeneficiariesTableProps {
  beneficiaries: Beneficiary[];
  manualDistributions: number;
  totalBeneficiaryPercentage: number;
  availableAmount?: number;
  accountId?: string;
  fiscalYearId?: string;
  fiscalYearLabel?: string;
  isClosed?: boolean;
}

const AccountsBeneficiariesTable = ({
  beneficiaries, manualDistributions, totalBeneficiaryPercentage,
  availableAmount = 0, accountId, fiscalYearId, fiscalYearLabel, isClosed = false,
}: AccountsBeneficiariesTableProps) => {
  const [distributeOpen, setDistributeOpen] = useState(false);

  const dist = computeDistributionBase(availableAmount, manualDistributions);
  const getShare = (b: Beneficiary) =>
    shareOf(dist.base, Number(b.share_percentage), totalBeneficiaryPercentage);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            توزيع حصص المستفيدين
          </span>
          {accountId && fiscalYearId && !isFyAll(fiscalYearId) && !isClosed && (
            <Button size="sm" className="gap-2" onClick={() => setDistributeOpen(true)}>
              <Banknote className="w-4 h-4" />
              توزيع الحصص
            </Button>
          )}
          {accountId && (!fiscalYearId || isFyAll(fiscalYearId)) && (
            <span className="text-xs text-muted-foreground">اختر سنة مالية محددة للتوزيع</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {beneficiaries.length === 0 ? (
          <EmptyState icon={Users} title="لا يوجد مستفيدون مسجلون" description="أضف مستفيدين من صفحة إدارة المستفيدين" compact />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {beneficiaries.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPercentage(b.share_percentage)}</p>
                  </div>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">
                    {fmt(getShare(b))} ريال
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
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
                        {fmt(getShare(b))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-2 px-3 py-2 bg-muted/40 rounded-md text-xs text-muted-foreground">
              {isClosed
                ? `سنة مقفلة — التوزيع المنفّذ ${fmt(dist.base)} ريال (للقراءة فقط)`
                : dist.usesDecided
                  ? `أساس التوزيع: المقرر ${fmt(dist.decided)} من المتاح ${fmt(dist.available)} — المتبقي ${fmt(dist.remaining)} (تقديري — يُعتمد عند الإقفال)`
                  : `أساس التوزيع: المتاح ${fmt(dist.available)} (تقديري — يُعتمد عند الإقفال)`}
            </div>
            {dist.exceeds && !isClosed && (
              <div className="mt-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md text-xs text-destructive">
                المبلغ المقرر أكبر من المتاح للتوزيع — اقتصر الجدول على المتاح
              </div>
            )}
            {isPercentageTotalOff(totalBeneficiaryPercentage) && (
              <div className="mt-2 px-3 py-2 bg-warning/10 border border-warning/30 rounded-md text-xs text-warning flex items-center gap-1">
                ⚠ مجموع نسب المستفيدين ({totalBeneficiaryPercentage}%) لا يساوي 100% — التوزيع يتم بشكل تناسبي
              </div>
            )}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex justify-between items-center">
              <span className="font-medium">إجمالي التوزيع</span>
              <span className="font-bold text-primary">
                {fmt(dist.base)} ريال
              </span>
            </div>
          </>
        )}
      </CardContent>

      {accountId && fiscalYearId && !isFyAll(fiscalYearId) && (
        <DistributeDialog
          open={distributeOpen}
          onOpenChange={setDistributeOpen}
          beneficiaries={beneficiaries}
          availableAmount={availableAmount}
          totalBeneficiaryPercentage={totalBeneficiaryPercentage}
          accountId={accountId}
          fiscalYearId={fiscalYearId}
          fiscalYearLabel={fiscalYearLabel}
        />
      )}
    </Card>
  );
};

export default memo(AccountsBeneficiariesTable);
