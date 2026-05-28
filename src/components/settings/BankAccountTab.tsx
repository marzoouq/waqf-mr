/**
 * BankAccountTab — يتيح للمستفيد تحديث رقم حسابه البنكي ورقم الهاتف
 * #B4: يستخدم RPC update_beneficiary_self (SECURITY DEFINER) مع تحقق مزدوج
 *      (طول/فراغ) في القاعدة. حقول الاسم والهوية تبقى للناظر فقط.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Landmark, Phone, Save, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';

interface BankAccountTabProps {
  bankAccount: string | null;
  phone: string | null;
}

const BankAccountTab = ({ bankAccount, phone }: BankAccountTabProps) => {
  const qc = useQueryClient();
  const [bank, setBank] = useState(bankAccount ?? '');
  const [phoneVal, setPhoneVal] = useState(phone ?? '');

  const mutation = useMutation({
    mutationFn: async () => {
      const bankTrim = bank.trim();
      const phoneTrim = phoneVal.trim();
      return await rpc('update_beneficiary_self', {
        p_bank_account: bankTrim || null,
        p_phone: phoneTrim || null,
      });
    },
    onSuccess: () => {
      uiNotify.success('تم حفظ بياناتك بنجاح');
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
    },
    onError: (err: unknown) => {
      logger.error('update_beneficiary_self failed', err);
      const msg = err instanceof Error ? err.message : 'تعذّر حفظ التعديلات';
      uiNotify.error(msg);
    },
  });

  const noChange =
    bank.trim() === (bankAccount ?? '').trim() &&
    phoneVal.trim() === (phone ?? '').trim();

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
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || noChange}
          className="gap-2"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التعديلات
        </Button>
      </CardContent>
    </Card>
  );
};

export default BankAccountTab;
