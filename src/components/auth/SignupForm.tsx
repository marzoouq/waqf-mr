import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { defaultNotify } from '@/lib/notify';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';

interface SignupFormProps {
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export default function SignupForm({ signUp }: SignupFormProps) {
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      defaultNotify.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (signupPassword.length < 8) {
      defaultNotify.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(normalizeArabicDigits(signupEmail), signupPassword);
    setIsLoading(false);
    if (error) {
      defaultNotify.error(getSafeErrorMessage(error));
    } else {
      defaultNotify.success('تم التسجيل بنجاح! يرجى تأكيد بريدك الإلكتروني. سيتم إنشاء حسابك كمستفيد ويحتاج تفعيل من ناظر الوقف.');
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
          autoComplete="email"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">كلمة المرور</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            placeholder="••••••••"
            dir="ltr"
            autoComplete="new-password"
            className="h-11 pe-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
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
