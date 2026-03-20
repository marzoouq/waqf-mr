import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Mail, IdCard, KeyRound, AlertTriangle, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { normalizeArabicDigits } from '@/utils/normalizeDigits';
import BiometricLoginButton from './BiometricLoginButton';

interface LoginFormProps {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  loading: boolean;
  onResetPassword: () => void;
  idSuffix?: string;
}

export default function LoginForm({ signIn, loading, onResetPassword, idSuffix = '' }: LoginFormProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'national_id'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [nidAttemptsRemaining, setNidAttemptsRemaining] = useState<number | null>(null);
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
      const resolvedEmail = normalizeArabicDigits(loginEmail);

      if (loginMethod === 'national_id') {
        if (!nationalId) {
          toast.error('يرجى إدخال رقم الهوية الوطنية');
          return;
        }

        if (nidLockedUntil && Date.now() < nidLockedUntil) {
          const secs = Math.ceil((nidLockedUntil - Date.now()) / 1000);
          toast.error(`تم تجاوز حد المحاولات. يرجى الانتظار ${secs} ثانية`);
          return;
        }

        if (!loginPassword) {
          toast.error('يرجى إدخال كلمة المرور');
          return;
        }

        const cleanId = normalizeArabicDigits(nationalId);

        if (!/^\d{10}$/.test(cleanId)) {
          toast.error('رقم الهوية يجب أن يكون 10 أرقام');
          return;
        }

        const { data, error: lookupError } = await supabase.functions.invoke('lookup-national-id', {
          body: { national_id: cleanId, password: loginPassword }
        });

        // معالجة أخطاء Rate Limit و أخطاء الاتصال
        if (lookupError || data?.error) {
          // فحص Rate Limit: الخطأ قد يكون في lookupError أو في data مباشرة
          const isRateLimited =
            data?.remaining === 0 ||
            data?.retry_after ||
            String(data?.error || '').includes('تم تجاوز حد المحاولات') ||
            String(lookupError?.message || '').includes('تم تجاوز حد المحاولات');

          if (isRateLimited) {
            const retryAfter = data?.retry_after || 180;
            const lockTime = Date.now() + retryAfter * 1000;
            setNidLockedUntil(lockTime);
            try { sessionStorage.setItem('nidLockedUntil', String(lockTime)); } catch { /* silent */ }
            setNidAttemptsRemaining(0);
            toast.error(`تم تجاوز حد المحاولات. يرجى الانتظار ${retryAfter} ثانية`);
            return;
          }

          // أخطاء أخرى (خطأ شبكة، خطأ خادم)
          if (lookupError) {
            toast.error('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى');
            return;
          }
        }

        if (data?.remaining !== undefined) {
          setNidAttemptsRemaining(data.remaining);
        }

        if (!data?.found) {
          // رسالة عامة لا تكشف وجود الهوية من عدمه — حماية من تعداد المستخدمين
          toast.error('بيانات الدخول غير صحيحة');
          return;
        }

        if (data?.auth_error) {
          toast.error(data.auth_error);
          logAccessEvent({
            event_type: 'login_failed',
            metadata: { error_message: 'nid_auth_error', login_method: 'national_id' },
          });
          return;
        }

        if (data?.session?.access_token && data?.session?.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (sessionError) {
            toast.error('حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
            logAccessEvent({
              event_type: 'login_failed',
              metadata: { error_message: 'session_set_error', login_method: 'national_id' },
            });
          } else {
            toast.success('تم تسجيل الدخول بنجاح');
            logAccessEvent({
              event_type: 'login_success',
              metadata: { login_method: 'national_id' },
            });
          }
          return;
        }

        toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
        return;
      } else {
        if (!resolvedEmail) {
          toast.error('يرجى إدخال البريد الإلكتروني');
          return;
        }
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
        toast.success('تم تسجيل الدخول بنجاح');
        supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
          logAccessEvent({
            event_type: 'login_success',
            email: resolvedEmail,
            user_id: currentUser?.id,
          });
        }).catch(() => { /* silent */ });
      }
    } catch {
      toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-5">
      <div className="space-y-3">
        <Label className="text-sm font-medium">طريقة تسجيل الدخول</Label>
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
          {nidAttemptsRemaining !== null && nidAttemptsRemaining <= 3 && (
            <div className={`flex items-center gap-1.5 text-xs mt-1 ${
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
      )}

      <div className="space-y-2">
        <Label htmlFor={`signin-password${idSuffix}`}>كلمة المرور</Label>
        <Input
          id={`signin-password${idSuffix}`}
          type="password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          placeholder="••••••••"
          dir="ltr"
          className="h-11"
        />
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
      <Button type="submit" className="w-full h-11 gradient-primary text-base font-medium shadow-elegant hover:shadow-gold transition-shadow" disabled={isLoading || loading}>
        {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
      </Button>

      <BiometricLoginButton />
    </form>
  );
}
