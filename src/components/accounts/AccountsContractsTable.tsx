import { memo } from 'react';
import { EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import type { Contract } from '@/types';
import { classifyContractOrigin } from '@/utils/financial/contractClassification';
import AccountsContractsMobileList from './contracts/AccountsContractsMobileList';
import AccountsContractsDesktopTable from './contracts/AccountsContractsDesktopTable';

interface AccountsContractsTableProps {
  contracts: Contract[];
  getPaymentPerPeriod: (contract: Contract) => number;
  getExpectedPayments: (contract: Contract) => number;
  totalPaymentPerPeriod: number;
  totalAnnualRent: number;
  statusLabel: (status: string) => string;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (id: string, name: string) => void;
  /** بداية السنة المالية الحالية. null في وضع "كل السنوات" — يُخفي عمود/شارة "النوع". */
  fiscalYearStartDate?: string | null;
}

const AccountsContractsTable = ({
  contracts, getPaymentPerPeriod, getExpectedPayments,
  totalPaymentPerPeriod, totalAnnualRent, statusLabel,
  onEditContract, onDeleteContract,
  fiscalYearStartDate = null,
}: AccountsContractsTableProps) => {
  const showOrigin = fiscalYearStartDate !== null;
  const totalPayments = contracts.reduce((s, c) => s + getExpectedPayments(c), 0);
  const countInYear = showOrigin
    ? contracts.filter(c => classifyContractOrigin(c.start_date, fiscalYearStartDate) === 'inYear').length
    : 0;
  const countFromPrevious = showOrigin
    ? contracts.filter(c => classifyContractOrigin(c.start_date, fiscalYearStartDate) === 'fromPrevious').length
    : 0;

  const sharedProps = {
    contracts, getPaymentPerPeriod, getExpectedPayments,
    totalPaymentPerPeriod, totalAnnualRent, totalPayments,
    statusLabel, onEditContract, onDeleteContract,
    fiscalYearStartDate, countInYear, countFromPrevious,
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          العقود
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <EmptyState icon={FileText} title="لا توجد عقود مسجلة" description="أضف عقوداً جديدة من صفحة العقود" compact />
        ) : (
          <>
            <AccountsContractsMobileList {...sharedProps} />
            <AccountsContractsDesktopTable {...sharedProps} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(AccountsContractsTable);
