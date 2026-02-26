import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Phone, Mail, CreditCard, Percent, UserCheck, IdCard } from 'lucide-react';
import { maskNationalId, maskBankAccount, maskPhone, maskEmail } from '@/utils/maskData';
import { formatPercentage } from '@/lib/utils';
import { Beneficiary } from '@/types/database';

interface BeneficiaryCardProps {
  beneficiary: Beneficiary;
  onEdit: (beneficiary: Beneficiary) => void;
  onDelete: (id: string, name: string) => void;
}

const BeneficiaryCard = ({ beneficiary, onEdit, onDelete }: BeneficiaryCardProps) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{beneficiary.name}</CardTitle>
            {beneficiary.user_id && (
              <Badge variant="secondary" className="text-xs"><UserCheck className="w-3 h-3 ml-1" />مرتبط</Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(beneficiary)}><Edit className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(beneficiary.id, `المستفيد ${beneficiary.name}`)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-lg font-bold text-primary"><Percent className="w-4 h-4" /><span>{formatPercentage(beneficiary.share_percentage)}</span></div>
        {beneficiary.phone && (<div className="flex items-center gap-2 text-sm text-muted-foreground" data-sensitive><Phone className="w-4 h-4" /><span dir="ltr">{maskPhone(beneficiary.phone)}</span></div>)}
        {beneficiary.email && (<div className="flex items-center gap-2 text-sm text-muted-foreground" data-sensitive><Mail className="w-4 h-4" /><span dir="ltr">{maskEmail(beneficiary.email)}</span></div>)}
        {beneficiary.bank_account && (<div className="flex items-center gap-2 text-sm text-muted-foreground" data-sensitive><CreditCard className="w-4 h-4" /><span dir="ltr">{maskBankAccount(beneficiary.bank_account)}</span></div>)}
        {beneficiary.national_id && (<div className="flex items-center gap-2 text-sm text-muted-foreground" data-sensitive><IdCard className="w-4 h-4" /><span dir="ltr">{maskNationalId(beneficiary.national_id)}</span></div>)}
      </CardContent>
    </Card>
  );
};

export default BeneficiaryCard;
