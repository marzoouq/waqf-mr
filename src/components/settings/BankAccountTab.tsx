/**
 * BankAccountTab — مكوّن عرضي بالكامل (Container/Presentational)
 * #B4: المنطق في `hooks/page/beneficiary/settings/useBankAccountTab`،
 *      وطبقة data في `hooks/data/beneficiaries/useUpdateBeneficiarySelf`.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Landmark, Phone, Save, Loader2 } from 'lucide-react';
import { useBankAccountTab } from '@/hooks/page/beneficiary/settings/useBankAccountTab';

interface BankAccountTabProps {
  bankAccount: string | null;
  phone: string | null;
}

const BankAccountTab = ({ bankAccount, phone }: BankAccountTabProps) => {
  const { bank, setBank, phoneVal, setPhoneVal, isSaving, noChange, handleSave } =
    useBankAccountTab({ bankAccount, phone });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Landmark className="w-5 h-5" /> الحساب البنكي وبيانات التواصل
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <Landmark className="w-3 h-3" /> رقم الحساب البنكي / IBAN
          </Label>
          <Input
            name="bank_account"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="SA00 0000 0000 0000 0000 0000"
            dir="ltr"
            maxLength={64}
          />
          <p className="text-xs text-muted-foreground">يُستخدم لتحويل حصتك من ريع الوقف.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs flex items-center gap-1">
            <Phone className="w-3 h-3" /> رقم الهاتف
          </Label>
          <Input
            name="phone"
            value={phoneVal}
            onChange={(e) => setPhoneVal(e.target.value)}
            placeholder="05XXXXXXXX"
            dir="ltr"
            maxLength={20}
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving || noChange} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التعديلات
        </Button>
      </CardContent>
    </Card>
  );
};

export default BankAccountTab;
