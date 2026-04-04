import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Mail, IdCard, KeyRound, AlertTriangle, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/normalizeDigits';
import { handleNationalIdLogin } from '@/lib/auth/nationalIdLogin';
import { useIsMountedRef } from '@/hooks/useIsMountedRef';
import BiometricLoginButton from './BiometricLoginButton';

interface LoginFormProps {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  loading: boolean;
  onResetPassword: () => void;
  idSuffix?: string;
}

export default function LoginForm({ signIn, loading: _loading, onResetPassword, idSuffix = '' }: LoginFormProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'national_id'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [nidAttemptsRemaining, setNidAttemptsRemaining] = useState<number | null>(null);
  const isMountedRef = useIsMountedRef();
  const [nidLockedUntil, setNidLockedUntil] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem('nidLockedUntil');
      if (stored) {
        const val = Number(stored);
        return val > Date.now() ? val : null;
      }
    } catch { /* silent */ }
    return null;
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (loginMethod === 'national_id') {
        await handleNationalIdLogin(nationalId, loginPassword, {
          nidLockedUntil,
          setNidLockedUntil,
          setNidAttemptsRemaining,
        });
        return;
      }

      const resolvedEmail = normalizeArabicDigits(loginEmail);
      if (!resolvedEmail) {
        toast.error('يرجى إدخال البريد الإلكتروني');
        return;
      }

      if (!loginPassword) {
        toast.error('يرجى إدخال كلمة المرور');
        return;
      }

      const { error } = await signIn(resolvedEmail, loginPassword);
      if (error) {
        toast.error(getSafeErrorMessage(error));
        logAccessEvent({
          event_type: 'login_failed',
          email: resolvedEmail,
          metadata: { error_message: 'login_error', login_method: loginMethod },
        });
      } else {
        // إشعار الدخول الناجح مُعطّل — الانتقال للوحة التحكم كافٍ
      }
    } catch {
      toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-5">
      <div className="space-y-3">
        <Label id="login-method-label" className="text-sm font-medium">طريقة تسجيل الدخول</Label>
        <RadioGroup
          value={loginMethod}
          onValueChange={(v) => setLoginMethod(v as 'email' | 'national_id')}
          className="flex flex-wrap gap-3"
          dir="rtl"
        >
          <label
            htmlFor={`method-email${idSuffix}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${
              loginMethod === 'email'
                ? 'border-primary bg-accent shadow-sm'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <RadioGroupItem value="email" id={`method-email${idSuffix}`} />
            <Mail className="w-4 h-4" />
            <span className="text-sm">البريد الإلكتروني</span>
          </label>
          <label
            htmlFor={`method-id${idSuffix}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${
              loginMethod === 'national_id'
                ? 'border-primary bg-accent shadow-sm'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <RadioGroupItem value="national_id" id={`method-id${idSuffix}`} />
            <IdCard className="w-4 h-4" />
            <span className="text-sm">رقم الهوية</span>
          </label>
        </RadioGroup>
      </div>

      {loginMethod === 'email' ? (
        <div className="space-y-2">
          <Label htmlFor={`signin-email${idSuffix}`}>البريد الإلكتروني</Label>
          <Input
            id={`signin-email${idSuffix}`}
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="example@email.com"
            dir="ltr"
            className="h-11"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`signin-national-id${idSuffix}`}>رقم الهوية الوطنية</Label>
          <Input
            id={`signin-national-id${idSuffix}`}
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder="1234567890"
            dir="ltr"
            className="h-11"
          />
          {/* مساحة محجوزة ثابتة لمنع القفزات البصرية (CLS) */}
          <div className="min-h-[1.25rem]">
            {nidAttemptsRemaining !== null && nidAttemptsRemaining <= 3 && (
              <div className={`flex items-center gap-1.5 text-xs ${
                nidAttemptsRemaining === 0 ? 'text-destructive' : 'text-caution-foreground'
              }`}>
                {nidAttemptsRemaining === 0 ? (
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {nidAttemptsRemaining === 0
                    ? 'تم تجاوز حد المحاولات — يرجى الانتظار دقيقتين'
                    : `المحاولات المتبقية: ${nidAttemptsRemaining}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`signin-password${idSuffix}`}>كلمة المرور</Label>
        <div className="relative">
          <Input
            id={`signin-password${idSuffix}`}
            type={showPassword ? 'text' : 'password'}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="••••••••"
            dir="ltr"
            autoComplete="current-password"
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
      <div className="flex justify-center">
        <Button
          type="button"
          variant="link"
          className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
          onClick={onResetPassword}
        >
          <KeyRound className="w-3.5 h-3.5 ml-1" />
          نسيت كلمة المرور؟
        </Button>
      </div>
      <Button type="submit" className="w-full h-11 gradient-primary text-base font-medium shadow-elegant hover:shadow-gold transition-shadow" disabled={isLoading}>
        {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
      </Button>

      <BiometricLoginButton />
    </form>
  );
}
