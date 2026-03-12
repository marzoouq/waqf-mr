import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/normalizeDigits';

interface SignupFormProps {
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export default function SignupForm({ signUp }: SignupFormProps) {
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (signupPassword.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(normalizeArabicDigits(signupEmail), signupPassword);
    setIsLoading(false);
    if (error) {
      toast.error(getSafeErrorMessage(error));
    } else {
      toast.success('تم التسجيل بنجاح! يرجى تأكيد بريدك الإلكتروني. سيتم إنشاء حسابك كمستفيد ويحتاج تفعيل من ناظر الوقف.');
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signup-email">البريد الإلكتروني</Label>
        <Input
          id="signup-email"
          type="email"
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
          placeholder="example@email.com"
          dir="ltr"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">كلمة المرور</Label>
        <Input
          id="signup-password"
          type="password"
          value={signupPassword}
          onChange={(e) => setSignupPassword(e.target.value)}
          placeholder="••••••••"
          dir="ltr"
          className="h-11"
        />
      </div>
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 text-center leading-relaxed">
        سيتم إنشاء حسابك كـ<strong>مستفيد</strong> ويحتاج تفعيل من ناظر الوقف قبل استخدامه.
      </p>
      <Button type="submit" className="w-full h-11 gradient-primary text-base font-medium shadow-elegant hover:shadow-gold transition-shadow" disabled={isLoading}>
        {isLoading ? 'جاري التسجيل...' : 'إنشاء حساب'}
      </Button>
    </form>
  );
}
