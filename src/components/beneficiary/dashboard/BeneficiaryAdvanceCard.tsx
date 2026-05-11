import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Banknote, ChevronLeft } from 'lucide-react';
import { ADVANCE_CARD_COPY } from '@/constants/beneficiaryCopy';

interface BeneficiaryAdvanceCardProps {
  pendingAdvanceCount: number;
}

/**
 * بطاقة السلفة في Dashboard — CR-07.
 * لا تُمرَّر هنا قيم مالية fallback (مثل paidAdvances=0).
 * المرجع الكامل لتفاصيل السلفة هو صفحة "حصتي".
 */
const BeneficiaryAdvanceCard = ({ pendingAdvanceCount }: BeneficiaryAdvanceCardProps) => {
  const navigate = useNavigate();
  const text = pendingAdvanceCount > 0
    ? ADVANCE_CARD_COPY.withPending(pendingAdvanceCount)
    : ADVANCE_CARD_COPY.default;

  return (
    <Card className="shadow-sm border-accent/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm">{ADVANCE_CARD_COPY.title}</p>
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/beneficiary/my-share')}
            className="gap-1 shrink-0"
          >
            {ADVANCE_CARD_COPY.ctaToMyShare}
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BeneficiaryAdvanceCard;
