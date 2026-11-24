import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Phone, Mail, CreditCard, Percent, UserCheck, IdCard, History } from 'lucide-react';
import { maskNationalId, maskBankAccount, maskPhone, maskEmail } from '@/utils/format/maskData';
import { formatPercentage } from '@/utils/format';
import { Beneficiary } from '@/types';
import DistributionHistory from './DistributionHistory';

interface BeneficiaryCardProps {
  beneficiary: Beneficiary;
  onEdit: (beneficiary: Beneficiary) => void;
  onDelete: (id: string, name: string) => void;
}

const BeneficiaryCard = ({ beneficiary, onEdit, onDelete }: BeneficiaryCardProps) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="space-y-2">
      <Card className="overflow-hidden rounded-2xl border-s-4 border-s-primary shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bronze-soft font-display text-lg font-bold text-bronze-foreground ring-1 ring-bronze-line" aria-hidden="true">
                {beneficiary.name.trim().charAt(0)}
              </div>
              <div className="min-w-0">
                <CardTitle className="font-display text-lg leading-snug">{beneficiary.name}</CardTitle>
                {beneficiary.user_id && (
                  <Badge variant="secondary" className="mt-1 text-xs"><UserCheck className="me-1 h-3 w-3" />مرتبط</Badge>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button variant="ghost" size="icon" aria-label="سجل التوزيعات" onClick={() => setShowHistory(!showHistory)} className={showHistory ? 'text-primary' : ''}><History className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={`تعديل بيانات ${beneficiary.name}`} onClick={() => onEdit(beneficiary)}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={`حذف ${beneficiary.name}`} onClick={() => onDelete(beneficiary.id, `المستفيد ${beneficiary.name}`)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Percent className="h-3.5 w-3.5" />نسبة الحصة</span>
            <span className="num text-lg font-bold text-primary">{formatPercentage(beneficiary.share_percentage)}</span>
          </div>
          <div className="space-y-1.5">
          {beneficiary.phone && (<div className="flex items-center gap-2 text-sm text-muted-foreground" data-sensitive><Phone className="w-4 h-4" /><span dir="ltr">{maskPhone(beneficiary.phone)}</span></div>)}
          {beneficiary.email && (<div className="flex items-center gap-2 text-sm text-muted-foreground" data-sensitive><Mail className="w-4 h-4" /><span dir="ltr">{maskEmail(beneficiary.email)}</span></div>)}
          {beneficiary.bank_account && (<div className="flex items-center gap-2 text-sm text-muted-foreground" data-sensitive><CreditCard className="w-4 h-4" /><span dir="ltr">{maskBankAccount(beneficiary.bank_account)}</span></div>)}
          {beneficiary.national_id && (<div className="flex items-center gap-2 text-sm text-muted-foreground" data-sensitive><IdCard className="w-4 h-4" /><span dir="ltr">{maskNationalId(beneficiary.national_id)}</span></div>)}
          </div>
        </CardContent>
      </Card>
      {showHistory && <DistributionHistory beneficiary={beneficiary} />}
    </div>
  );
};

export default BeneficiaryCard;
