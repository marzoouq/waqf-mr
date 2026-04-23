/**
 * تبويب معلومات الحساب
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Shield } from 'lucide-react';

interface AccountTabProps {
  name: string;
  email: string;
  maskedId: string;
}

const AccountTab = ({ name, email, maskedId }: AccountTabProps) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
        <User className="w-5 h-5" />
        معلومات الحساب
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" /> الاسم
          </Label>
          <Input name="beneficiary_name" value={name} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">البريد الإلكتروني</Label>
          <Input name="email" value={email} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <Lock className="w-3 h-3" /> رقم الهوية
          </Label>
          <div className="flex items-center gap-2">
            <Input name="maskedId" value={maskedId} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
            <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        هذه المعلومات تُدار بواسطة ناظر الوقف. للتعديل يرجى التواصل عبر المراسلات.
      </p>
    </CardContent>
  </Card>
);

export default AccountTab;
