/**
 * ملخص العقود التشغيلية في الإفصاح السنوي — أرقام إجمالية فقط.
 * تفاصيل كل عقد ومستأجره في صفحة العقود المخصصة ولا تتكرر هنا.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FigureTile, FigureTileGrid } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import type { DisclosureContractsSummary } from '@/utils/contracts/disclosureContractsSummary';
import InfoHint from './InfoHint';

interface Props {
  summary: DisclosureContractsSummary;
  isLoading: boolean;
}

export const CONTRACTS_TOTAL_HINT = 'القيمة التعاقدية السنوية للعقود، وقد يخص جزء منها سنوات قادمة أو أقساطاً مرحّلة، لذا قد تختلف عن إجمالي الإيرادات.';

const ContractIcon = DOMAIN_ICONS.contract;

const DisclosureContractsSection = ({ summary, isLoading }: Props) => (
  <Card className="shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
      <CardTitle className="flex items-center gap-2 font-display text-xl text-primary dark:text-foreground">
        <ContractIcon className="w-5 h-5 text-bronze" aria-hidden="true" />
        ملخص العقود التشغيلية
      </CardTitle>
      <Button asChild variant="ghost" size="sm" className="gap-1 shrink-0">
        <Link to="/beneficiary/contracts">
          تفاصيل العقود
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        </Link>
      </Button>
    </CardHeader>
    <CardContent>
      {!isLoading && summary.total === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">لا توجد عقود مسجلة</p>
      ) : (
        <FigureTileGrid cols="lg:grid-cols-4" isLoading={isLoading}>
          <FigureTile
            label="إجمالي القيمة السنوية للعقود"
            value={summary.annualValue}
            icon={ContractIcon}
            tone="neutral"
            badge={<InfoHint label="شرح إجمالي القيمة السنوية" text={CONTRACTS_TOTAL_HINT} />}
            className="col-span-2 lg:col-span-1"
          />
          <FigureTile label="عدد العقود" value={summary.total} unit="count" icon={ContractIcon} tone="neutral" />
          <FigureTile label="عقود نشطة" value={summary.active} unit="count" icon={CheckCircle} tone="success" />
          <FigureTile label="عقود منتهية" value={summary.expired} unit="count" icon={Clock} tone="warning" />
          {summary.cancelled > 0 && (
            <FigureTile label="عقود ملغاة" value={summary.cancelled} unit="count" icon={Ban} tone="expense" />
          )}
        </FigureTileGrid>
      )}
    </CardContent>
  </Card>
);

export default DisclosureContractsSection;
