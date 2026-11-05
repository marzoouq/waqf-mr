import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AccountsYearEndCardProps {
  fyLabel?: string;
  isActive: boolean;
  canClose: boolean;
  onClose: () => void;
}

/** بطاقة إجراءات نهاية العام — عرض فقط، المنطق في useAccountsPage */
const AccountsYearEndCard = ({ fyLabel, isActive, canClose, onClose }: AccountsYearEndCardProps) => (
  <Card>
    <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="font-bold">إقفال السنة المالية {fyLabel ?? ''}</p>
        <p className="text-sm text-muted-foreground">
          {isActive ? 'يُجري فحص ما قبل الإقفال ثم يحفظ لقطة نهائية للسنة.' : 'هذه السنة مقفلة — أرقامها محفوظة للقراءة فقط.'}
        </p>
      </div>
      {canClose && isActive && (
        <Button variant="destructive" onClick={onClose} className="gap-2">
          <Lock className="w-4 h-4" />
          إقفال السنة
        </Button>
      )}
    </CardContent>
  </Card>
);

export default AccountsYearEndCard;
