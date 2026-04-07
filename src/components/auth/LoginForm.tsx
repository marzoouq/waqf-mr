import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { defaultNotify } from '@/lib/notify';
import { Loader2 } from 'lucide-react';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/format/normalizeDigits';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { handleNationalIdLogin } from '@/lib/auth/nationalIdLogin';
import { useIsMountedRef } from '@/hooks/ui/useIsMountedRef';
import { EMAIL_REGEX } from '@/utils/validation';
import BiometricLoginButton from './BiometricLoginButton';
import ServerErrorAlert from './ServerErrorAlert';
import LoginMethodSelector from './login/LoginMethodSelector';
import EmailField from './login/EmailField';
import NationalIdField from './login/NationalIdField';
import PasswordField from './login/PasswordField';

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
      <ServerErrorAlert message={serverError} onDismiss={() => setServerError(null)} />

      <LoginMethodSelector
        loginMethod={loginMethod}
        onChange={(m) => { setLoginMethod(m); setServerError(null); }}
        isLoading={isLoading}
        idSuffix={idSuffix}
      />

      {loginMethod === 'email' ? (
        <EmailField
          ref={emailRef}
          value={loginEmail}
          onChange={(v) => { setLoginEmail(v); clearFieldError('email'); setServerError(null); }}
          onBlur={() => validateEmailFormat(loginEmail)}
          error={fieldErrors.email}
          isLoading={isLoading}
          idSuffix={idSuffix}
        />
      ) : (
        <NationalIdField
          ref={nidRef}
          value={nationalId}
          onChange={(v) => { setNationalId(v); clearFieldError('nationalId'); setServerError(null); }}
          error={fieldErrors.nationalId}
          isLoading={isLoading}
          idSuffix={idSuffix}
          attemptsRemaining={nidAttemptsRemaining}
        />
      )}

      <PasswordField
        ref={passwordRef}
        value={loginPassword}
        onChange={(v) => { setLoginPassword(v); clearFieldError('password'); setServerError(null); }}
        error={fieldErrors.password}
        isLoading={isLoading}
        idSuffix={idSuffix}
        onResetPassword={onResetPassword}
      />

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
