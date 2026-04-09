import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLoginForm } from '@/hooks/auth/useLoginForm';
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
  const {
    loginEmail, setLoginEmail,
    loginPassword, setLoginPassword,
    nationalId, setNationalId,
    loginMethod, setLoginMethod,
    isLoading,
    nidAttemptsRemaining,
    serverError, setServerError,
    fieldErrors,
    formRef, emailRef, passwordRef, nidRef,
    clearFieldError,
    validateEmailFormat,
    handleSignIn,
  } = useLoginForm({ signIn });

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
