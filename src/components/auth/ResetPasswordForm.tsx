import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePasswordResetRequest } from '@/hooks/auth/usePasswordResetRequest';

interface ResetPasswordFormProps {
  onBack: () => void;
}

export default function ResetPasswordForm({ onBack }: ResetPasswordFormProps) {
  const { resetEmail, setResetEmail, isLoading, handleRequest } = usePasswordResetRequest(onBack);

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
        onClick={handleRequest}
      >
        {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
      </Button>
      <Button variant="ghost" className="w-full" onClick={onBack}>
        العودة لتسجيل الدخول
      </Button>
    </div>
  );
}
