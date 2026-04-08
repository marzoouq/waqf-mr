import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { usePasswordResetRequest } from '@/hooks/auth/usePasswordResetRequest';
import { EMAIL_REGEX } from '@/utils/validation/index';

interface ResetPasswordFormProps {
  onBack: () => void;
}

export default function ResetPasswordForm({ onBack }: ResetPasswordFormProps) {
  const { resetEmail, setResetEmail, isLoading, handleRequest } = usePasswordResetRequest(onBack);
  const [emailError, setEmailError] = useState('');

  const clearError = () => { if (emailError) setEmailError(''); };

  const validateEmailFormat = () => {
    if (resetEmail && !EMAIL_REGEX.test(resetEmail)) {
      setEmailError('صيغة البريد الإلكتروني غير صحيحة');
    }
  };

  const onSubmit = () => {
    if (!resetEmail) {
      setEmailError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!EMAIL_REGEX.test(resetEmail)) {
      setEmailError('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }
    setEmailError('');
    handleRequest();
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground text-center">أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور</p>
      <div className="space-y-2">
        <Label htmlFor="reset-email">البريد الإلكتروني</Label>
        <Input
          id="reset-email"
          type="email"
          value={resetEmail}
          onChange={(e) => { setResetEmail(e.target.value); clearError(); }}
          onBlur={validateEmailFormat}
          placeholder="example@email.com"
          dir="ltr"
          className="h-11"
          disabled={isLoading}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'reset-email-error' : undefined}
        />
        <div className="min-h-[1.25rem]" aria-live="polite">
          {emailError && (
            <p id="reset-email-error" role="alert" className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {emailError}
            </p>
          )}
        </div>
      </div>
      <Button
        className="w-full h-11 gradient-primary"
        disabled={isLoading}
        onClick={onSubmit}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري الإرسال...
          </span>
        ) : 'إرسال رابط إعادة التعيين'}
      </Button>
      <Button variant="ghost" className="w-full" onClick={onBack}>
        العودة لتسجيل الدخول
      </Button>
    </div>
  );
}
