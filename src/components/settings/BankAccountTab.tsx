/**
 * BankAccountTab — مكوّن عرضي بالكامل (Container/Presentational)
 * R7 (W4-F05): الحساب البنكي مُقنَّع افتراضياً مع زر إظهار/إخفاء؛
 * القيمة الكاملة لا تظهر في الـ DOM إلا بعد ضغط المستخدم.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Landmark, Phone, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { useBankAccountTab } from '@/hooks/page/beneficiary/settings/useBankAccountTab';

interface BankAccountTabProps {
  bankAccount: string | null;
  phone: string | null;
}

/** يقنّع رقم الحساب مع إبقاء آخر 4 أرقام مرئية. */
function maskBankAccount(value: string): string {
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= 4) return '•'.repeat(clean.length);
  return '•'.repeat(Math.max(0, clean.length - 4)) + clean.slice(-4);
}

const BankAccountTab = ({ bankAccount, phone }: BankAccountTabProps) => {
  const { bank, setBank, phoneVal, setPhoneVal, isSaving, noChange, handleSave } =
    useBankAccountTab({ bankAccount, phone });
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);

  const displayValue = editing || revealed ? bank : (bank ? maskBankAccount(bank) : '');

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
          <div className="flex gap-2">
            <Input
              name="bank_account"
              value={displayValue}
              onChange={(e) => setBank(e.target.value)}
              onFocus={() => setEditing(true)}
              onBlur={() => setEditing(false)}
              placeholder="SA00 0000 0000 0000 0000 0000"
              dir="ltr"
              maxLength={64}
              autoComplete="off"
              aria-label="رقم الحساب البنكي"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? 'إخفاء رقم الحساب' : 'إظهار رقم الحساب'}
              title={revealed ? 'إخفاء' : 'إظهار'}
            >
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">يُستخدم لتحويل حصتك من ريع الوقف. مُقنَّع افتراضياً لحمايتك.</p>
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
