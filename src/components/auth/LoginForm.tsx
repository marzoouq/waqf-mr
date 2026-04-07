import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { defaultNotify } from '@/lib/notify';
import { Mail, IdCard, KeyRound, AlertTriangle, ShieldAlert, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { handleNationalIdLogin } from '@/lib/auth/nationalIdLogin';
import { useIsMountedRef } from '@/hooks/ui/useIsMountedRef';
import { EMAIL_REGEX } from '@/utils/validation';
import BiometricLoginButton from './BiometricLoginButton';
import ServerErrorAlert from './ServerErrorAlert';

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
  const [serverError, setServerError] = useState<string | null>(null);
  const isMountedRef = useIsMountedRef();
  const formRef = useRef<HTMLFormElement>(null);
  const [nidLockedUntil, setNidLockedUntil] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.NID_LOCKED_UNTIL);
      if (stored) {
        const val = Number(stored);
        return val > Date.now() ? val : null;
      }
    } catch { /* silent */ }
    return null;
  });

  // أخطاء محلية أسفل الحقول
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; nationalId?: string }>({});

  // مراجع الحقول لإدارة التركيز
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nidRef = useRef<HTMLInputElement>(null);

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

  /** ينقل التركيز لأول حقل خاطئ */
  const focusFirstError = (errors: typeof fieldErrors) => {
    if (errors.email) emailRef.current?.focus();
    else if (errors.nationalId) nidRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // تحقق محلي
    const errors: typeof fieldErrors = {};
    if (loginMethod === 'email') {
      if (!loginEmail) errors.email = 'يرجى إدخال البريد الإلكتروني';
      else if (!EMAIL_REGEX.test(loginEmail)) errors.email = 'صيغة البريد الإلكتروني غير صحيحة';
      if (!loginPassword) errors.password = 'يرجى إدخال كلمة المرور';
    } else {
      if (!nationalId) errors.nationalId = 'يرجى إدخال رقم الهوية';
      if (!loginPassword) errors.password = 'يرجى إدخال كلمة المرور';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(errors);
      return;
    }

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

      const { error } = await signIn(resolvedEmail, loginPassword);
      if (error) {
        const msg = getSafeErrorMessage(error);
        setServerError(msg);
        defaultNotify.error(msg);
        logAccessEvent({
          event_type: 'login_failed',
          email: resolvedEmail,
          metadata: { error_message: 'login_error', login_method: loginMethod },
        });
      }
    } catch {
      const msg = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      setServerError(msg);
      defaultNotify.error(msg);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSignIn} className="space-y-5" aria-busy={isLoading}>
      {/* تنبيه خطأ الخادم */}
      <ServerErrorAlert message={serverError} onDismiss={() => setServerError(null)} />

      <div className="space-y-3">
        <Label id="login-method-label" className="text-sm font-medium">طريقة تسجيل الدخول</Label>
        <RadioGroup
          value={loginMethod}
          onValueChange={(v) => { setLoginMethod(v as 'email' | 'national_id'); setServerError(null); }}
          className="flex flex-wrap gap-3"
          dir="rtl"
          disabled={isLoading}
        >
          <label
            htmlFor={`method-email${idSuffix}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
              loginMethod === 'email'
                ? 'border-primary bg-accent shadow-sm'
                : 'border-border hover:border-primary/30'
            } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <RadioGroupItem value="email" id={`method-email${idSuffix}`} />
            <Mail className="w-4 h-4" />
            <span className="text-sm">البريد الإلكتروني</span>
          </label>
          <label
            htmlFor={`method-id${idSuffix}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
              loginMethod === 'national_id'
                ? 'border-primary bg-accent shadow-sm'
                : 'border-border hover:border-primary/30'
            } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
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
            ref={emailRef}
            id={`signin-email${idSuffix}`}
            type="email"
            value={loginEmail}
            onChange={(e) => { setLoginEmail(e.target.value); clearFieldError('email'); setServerError(null); }}
            onBlur={() => validateEmailFormat(loginEmail)}
            placeholder="example@email.com"
            dir="ltr"
            className="h-11"
            disabled={isLoading}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? `signin-email-error${idSuffix}` : undefined}
          />
          <div className="min-h-[1.25rem]" aria-live="polite">
            {fieldErrors.email && (
              <p id={`signin-email-error${idSuffix}`} role="alert" className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.email}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`signin-national-id${idSuffix}`}>رقم الهوية الوطنية</Label>
          <Input
            ref={nidRef}
            id={`signin-national-id${idSuffix}`}
            type="text"
            value={nationalId}
            onChange={(e) => { setNationalId(e.target.value); clearFieldError('nationalId'); setServerError(null); }}
            placeholder="1234567890"
            dir="ltr"
            className="h-11"
            disabled={isLoading}
            aria-invalid={!!fieldErrors.nationalId}
            aria-describedby={fieldErrors.nationalId ? `signin-nid-error${idSuffix}` : undefined}
          />
          {/* مساحة محجوزة ثابتة لمنع القفزات البصرية (CLS) */}
          <div className="min-h-[1.25rem]" aria-live="polite">
            {fieldErrors.nationalId && (
              <p id={`signin-nid-error${idSuffix}`} role="alert" className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {fieldErrors.nationalId}
              </p>
            )}
            {!fieldErrors.nationalId && nidAttemptsRemaining !== null && nidAttemptsRemaining <= 3 && (
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
            ref={passwordRef}
            id={`signin-password${idSuffix}`}
            type={showPassword ? 'text' : 'password'}
            value={loginPassword}
            onChange={(e) => { setLoginPassword(e.target.value); clearFieldError('password'); setServerError(null); }}
            placeholder="••••••••"
            dir="ltr"
            autoComplete="current-password"
            className="h-11 pe-10"
            disabled={isLoading}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? `signin-password-error${idSuffix}` : undefined}
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
            <p id={`signin-password-error${idSuffix}`} role="alert" className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {fieldErrors.password}
            </p>
          )}
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
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري تسجيل الدخول...
          </span>
        ) : 'تسجيل الدخول'}
      </Button>

      <BiometricLoginButton />
    </form>
  );
}
