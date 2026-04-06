import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { defaultNotify } from '@/lib/notify';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';
import { EMAIL_REGEX } from '@/utils/validation';
import PasswordStrengthBar from './PasswordStrengthBar';
import ServerErrorAlert from './ServerErrorAlert';

interface SignupFormProps {
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export default function SignupForm({ signUp }: SignupFormProps) {
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // أخطاء محلية أسفل الحقول
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // مراجع الحقول لإدارة التركيز
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const clearFieldError = (field: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateEmailFormat = (value: string) => {
    if (value && !EMAIL_REGEX.test(value)) {
      setFieldErrors((prev) => ({ ...prev, email: 'صيغة البريد الإلكتروني غير صحيحة' }));
    }
  };

  const focusFirstError = (errors: typeof fieldErrors) => {
    if (errors.email) emailRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // تحقق محلي
    const errors: typeof fieldErrors = {};
    if (!signupEmail) errors.email = 'يرجى إدخال البريد الإلكتروني';
    else if (!EMAIL_REGEX.test(signupEmail)) errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
    if (!signupPassword) errors.password = 'يرجى إدخال كلمة المرور';
    else if (signupPassword.length < 8) errors.password = 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(normalizeArabicDigits(signupEmail), signupPassword);
    setIsLoading(false);
    if (error) {
      const msg = getSafeErrorMessage(error);
      setServerError(msg);
      defaultNotify.error(msg);
    } else {
      defaultNotify.success('تم التسجيل بنجاح! يرجى تأكيد بريدك الإلكتروني. سيتم إنشاء حسابك كمستفيد ويحتاج تفعيل من ناظر الوقف.');
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-5" aria-busy={isLoading}>
      {/* تنبيه خطأ الخادم */}
      <ServerErrorAlert message={serverError} onDismiss={() => setServerError(null)} />

      <div className="space-y-2">
        <Label htmlFor="signup-email">البريد الإلكتروني</Label>
        <Input
          ref={emailRef}
          id="signup-email"
          type="email"
          value={signupEmail}
          onChange={(e) => { setSignupEmail(e.target.value); clearFieldError('email'); setServerError(null); }}
          onBlur={() => validateEmailFormat(signupEmail)}
          placeholder="example@email.com"
          dir="ltr"
          autoComplete="email"
          className="h-11"
          disabled={isLoading}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
        />
        <div className="min-h-[1.25rem]" aria-live="polite">
          {fieldErrors.email && (
            <p id="signup-email-error" role="alert" className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">كلمة المرور</Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            value={signupPassword}
            onChange={(e) => { setSignupPassword(e.target.value); clearFieldError('password'); setServerError(null); }}
            placeholder="••••••••"
            dir="ltr"
            autoComplete="new-password"
            className="h-11 pe-10"
            disabled={isLoading}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'signup-password-error' : 'signup-password-strength'}
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
        <div className="min-h-[1.25rem]" aria-live="polite">
          {fieldErrors.password && (
            <p id="signup-password-error" role="alert" className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fieldErrors.password}
            </p>
          )}
        </div>
        <div id="signup-password-strength">
          <PasswordStrengthBar password={signupPassword} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 text-center leading-relaxed">
        سيتم إنشاء حسابك كـ<strong>مستفيد</strong> ويحتاج تفعيل من ناظر الوقف قبل استخدامه.
      </p>
      <Button type="submit" className="w-full h-11 gradient-primary text-base font-medium shadow-elegant hover:shadow-gold transition-shadow" disabled={isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري التسجيل...
          </span>
        ) : 'إنشاء حساب'}
      </Button>
    </form>
  );
}
