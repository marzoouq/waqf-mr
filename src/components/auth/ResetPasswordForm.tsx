import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/normalizeDigits';

interface ResetPasswordFormProps {
  onBack: () => void;
}

export default function ResetPasswordForm({ onBack }: ResetPasswordFormProps) {
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground text-center">أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور</p>
      <div className="space-y-2">
        <Label htmlFor="reset-email">البريد الإلكتروني</Label>
        <Input
          id="reset-email"
          type="email"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          placeholder="example@email.com"
          dir="ltr"
          className="h-11"
        />
      </div>
      <Button
        className="w-full h-11 gradient-primary"
        disabled={isLoading}
        onClick={async () => {
          if (!resetEmail) { toast.error('يرجى إدخال البريد الإلكتروني'); return; }
          setIsLoading(true);
          const { error } = await supabase.auth.resetPasswordForEmail(normalizeArabicDigits(resetEmail), {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          setIsLoading(false);
          if (error) { toast.error(getSafeErrorMessage(error)); }
          else { toast.success('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني'); onBack(); }
        }}
      >
        {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
      </Button>
      <Button variant="ghost" className="w-full" onClick={onBack}>
        العودة لتسجيل الدخول
      </Button>
    </div>
  );
}
