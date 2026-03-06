import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Building2, LogIn, UserPlus, IdCard, Mail, KeyRound, Download, Loader2, Fingerprint, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useWebAuthn, isBiometricEnabled } from '@/hooks/useWebAuthn';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';

/** تحويل الأرقام العربية-الهندية (٠-٩) والفارسية (۰-۹) إلى أرقام لاتينية */
function normalizeArabicDigits(str: string): string {
  return str
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
    .trim();
}

const Auth = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'national_id'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [nidAttemptsRemaining, setNidAttemptsRemaining] = useState<number | null>(null);
  const [nidLockedUntil, setNidLockedUntil] = useState<number | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { signIn, signUp, user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { authenticateWithBiometric, isLoading: biometricLoading, isSupported: biometricSupported } = useWebAuthn();
  const [showBiometric] = useState(() => isBiometricEnabled() && browserSupportsWebAuthn());

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<(Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show idle logout message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'idle') {
      toast.info('تم تسجيل خروجك تلقائياً بسبب عدم النشاط. يرجى تسجيل الدخول مرة أخرى.');
      logAccessEvent({ event_type: 'idle_logout', target_path: '/auth?reason=idle' });
      window.history.replaceState({}, '', '/auth');
    }
  }, []);

  // مؤقت أمان صارم: يمنع الزر من البقاء معلقاً أكثر من 10 ثوانٍ
  useEffect(() => {
    if (!isLoading) return;
    const safety = setTimeout(() => {
      setIsLoading(false);
      // Force-reset isLoading after 10s safety timeout
    }, 10000);
    return () => clearTimeout(safety);
  }, [isLoading]);

  // توجيه المستخدم بعد تسجيل الدخول
  useEffect(() => {
    if (user && !loading && role) {
      if (role === 'beneficiary') {
        navigate('/beneficiary');
      } else if (role === 'admin' || role === 'accountant') {
        navigate('/dashboard');
      } else if (role === 'waqif') {
        navigate('/beneficiary');
      }
    }
  }, [user, role, loading, navigate]);

  // آلية حماية: إذا تم تسجيل الدخول لكن الدور لم يُحل بعد 5 ثوانٍ (يعتمد على AuthContext)
  const [roleWaitTimeout, setRoleWaitTimeout] = useState(false);
  useEffect(() => {
    if (!user || loading || role) {
      setRoleWaitTimeout(false);
      return;
    }
    const timer = setTimeout(() => {
      // Role not resolved after 5s from AuthContext
      setRoleWaitTimeout(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [user, role, loading]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'registration_enabled')
          .maybeSingle();
        if (!error && data) {
          setRegistrationEnabled(data.value === 'true');
        }
      } catch {
        // الافتراضي false — لا تسجيل مفتوح
      }
    };
    fetchSettings();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let resolvedEmail = normalizeArabicDigits(loginEmail);

      if (loginMethod === 'national_id') {
        if (!nationalId) {
          toast.error('يرجى إدخال رقم الهوية الوطنية');
          return;
        }

        // Check if currently locked out
        if (nidLockedUntil && Date.now() < nidLockedUntil) {
          const secs = Math.ceil((nidLockedUntil - Date.now()) / 1000);
          toast.error(`تم تجاوز حد المحاولات. يرجى الانتظار ${secs} ثانية`);
          return;
        }

        // تحويل الأرقام العربية/الفارسية تلقائياً
        const cleanId = normalizeArabicDigits(nationalId);

        // التحقق الفوري من صحة التنسيق قبل الإرسال
        if (!/^\d{10}$/.test(cleanId)) {
          toast.error('رقم الهوية يجب أن يكون 10 أرقام');
          return;
        }

        const { data, error: lookupError } = await supabase.functions.invoke('lookup-national-id', {
          body: { national_id: cleanId }
        });

        // Handle rate limiting (429)
        if (lookupError && data?.remaining === 0) {
          const retryAfter = data?.retry_after || 120;
          setNidLockedUntil(Date.now() + retryAfter * 1000);
          setNidAttemptsRemaining(0);
          toast.error(`تم تجاوز حد المحاولات. يرجى الانتظار ${retryAfter} ثانية`);
          return;
        }

        // Update remaining attempts from response
        if (data?.remaining !== undefined) {
          setNidAttemptsRemaining(data.remaining);
        }

        if (lookupError) {
          toast.error('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى');
          return;
        }
        if (!data?.found || !data?.email) {
          toast.error('رقم الهوية غير مسجل في النظام. تأكد من صحة الرقم أو تواصل مع ناظر الوقف.');
          return;
        }
        // استخدام البريد الحقيقي المرجع من قاعدة البيانات
        resolvedEmail = data.email;
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
        // Distinguish password error from other errors for better UX
        const errMsg = error.message?.toLowerCase() || '';
        if (loginMethod === 'national_id' && errMsg.includes('invalid login credentials')) {
          toast.error('كلمة المرور غير صحيحة. تأكد من كلمة المرور أو استخدم "نسيت كلمة المرور".');
        } else {
          toast.error(getSafeErrorMessage(error));
        }
        logAccessEvent({
          event_type: 'login_failed',
          email: loginMethod === 'national_id' ? null : resolvedEmail,
          metadata: { error_message: 'login_error', login_method: loginMethod },
        });
      } else {
        toast.success('تم تسجيل الدخول بنجاح');
        supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
          logAccessEvent({
            event_type: 'login_success',
            email: loginMethod === 'national_id' ? null : resolvedEmail,
            user_id: currentUser?.id,
          });
        }).catch(() => { /* silent */ });
      }
    } catch (err) {
      // handleSignIn error — toast handles user notification
      toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderLoginForm = (idSuffix = '') => (
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
          {/* عداد المحاولات المتبقية */}
          {nidAttemptsRemaining !== null && nidAttemptsRemaining <= 3 && (
            <div className={`flex items-center gap-1.5 text-xs mt-1 ${
              nidAttemptsRemaining === 0 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
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
          onClick={() => setResetMode(true)}
        >
          <KeyRound className="w-3.5 h-3.5 ml-1" />
          نسيت كلمة المرور؟
        </Button>
      </div>
      <Button type="submit" className="w-full h-11 gradient-primary text-base font-medium shadow-elegant hover:shadow-gold transition-shadow" disabled={isLoading}>
        {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
      </Button>

      {/* زر تسجيل الدخول بالبصمة */}
      {showBiometric && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-2 border-primary/30 hover:bg-primary/5"
          disabled={biometricLoading}
          onClick={async () => {
            const success = await authenticateWithBiometric();
            if (success) {
              // سيتم التوجيه تلقائياً عبر useEffect
            }
          }}
        >
          {biometricLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Fingerprint className="w-5 h-5 text-primary" />
          )}
          تسجيل الدخول بالبصمة
        </Button>
      )}
    </form>
  );

  // إذا المستخدم مسجّل دخوله وينتظر التوجيه، عرض شاشة انتقالية
  if (user && !loading && !role) {
    return (
      <div className="min-h-screen gradient-auth pattern-islamic-strong flex items-center justify-center p-4" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          {roleWaitTimeout ? (
            <>
              <span className="text-lg font-medium text-destructive">لم يتم التعرف على صلاحياتك</span>
              <span className="text-sm text-muted-foreground">تواصل مع الناظر أو حاول مرة أخرى</span>
              <Button variant="outline" onClick={async () => { await signOut(); window.location.reload(); }}>
                تسجيل الخروج
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-lg font-medium text-foreground">جاري التحقق من الصلاحيات...</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-auth pattern-islamic-strong flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-elegant animate-slide-up border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-5 pb-2">
            {/* Logo with glow */}
            <div className="mx-auto w-20 h-20 gradient-gold rounded-2xl flex items-center justify-center shadow-gold animate-glow">
              <Building2 className="w-10 h-10 text-primary-foreground" />
            </div>

            {/* Title with Amiri font */}
            <div className="space-y-2">
              <CardTitle className="text-3xl font-display font-bold tracking-wide">
                نظام إدارة الوقف
              </CardTitle>
              <div className="ornament-divider py-2">
                <span className="text-gradient-gold text-sm font-display px-4">❖</span>
              </div>
              <CardDescription className="text-base">
                {registrationEnabled ? 'تسجيل الدخول أو إنشاء حساب جديد' : 'تسجيل الدخول إلى النظام'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {resetMode ? (
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
                  onClick={async () => {
                    if (!resetEmail) { toast.error('يرجى إدخال البريد الإلكتروني'); return; }
                    setIsLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(normalizeArabicDigits(resetEmail), {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    setIsLoading(false);
                    if (error) { toast.error(getSafeErrorMessage(error)); }
                    else { toast.success('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني'); setResetMode(false); }
                  }}
                >
                  {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setResetMode(false)}>
                  العودة لتسجيل الدخول
                </Button>
              </div>
            ) : registrationEnabled ? (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-11">
                  <TabsTrigger value="signin" className="gap-2 text-sm">
                    <LogIn className="w-4 h-4" />
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="gap-2 text-sm">
                    <UserPlus className="w-4 h-4" />
                    حساب جديد
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  {renderLoginForm()}
                </TabsContent>

                <TabsContent value="signup">
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
                </TabsContent>
              </Tabs>
            ) : (
              renderLoginForm('-direct')
            )}
            </CardContent>
        </Card>

        {/* Install app button */}
        {!isAppInstalled && (
          <Button
            variant="outline"
            className="w-full mt-4 gap-2 bg-card/80 backdrop-blur-sm border-border/50 hover:bg-accent"
            onClick={() => {
              if (installPrompt) {
                installPrompt.prompt();
                installPrompt.userChoice.then((r: { outcome: string }) => {
                  if (r.outcome === 'accepted') setIsAppInstalled(true);
                  setInstallPrompt(null);
                });
              } else {
                navigate('/install');
              }
            }}
          >
            <Download className="w-4 h-4" />
            تثبيت التطبيق على جوالك
          </Button>
        )}

        {/* Footer text */}
        <p className="text-center text-primary-foreground/40 text-xs mt-4 font-display">
          ❖ بركة الوقف ❖
        </p>
      </div>
    </div>
  );
};

export default Auth;
