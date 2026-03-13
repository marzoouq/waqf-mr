import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, LogIn, UserPlus, Download, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logAccessEvent } from '@/hooks/useAccessLog';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

const Auth = () => {
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { signIn, signUp, user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

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

  // Redirect after login
  useEffect(() => {
    if (user && !loading && role) {
      if (role === 'beneficiary') {
        navigate('/beneficiary');
      } else if (role === 'admin' || role === 'accountant') {
        navigate('/dashboard');
      } else if (role === 'waqif') {
        navigate('/waqif');
      }
    }
  }, [user, role, loading, navigate]);

  // Role wait timeout
  const [roleWaitTimeout, setRoleWaitTimeout] = useState(false);
  useEffect(() => {
    if (!user || loading || role) {
      setRoleWaitTimeout(false);
      return;
    }
    const timer = setTimeout(() => setRoleWaitTimeout(true), 5000);
    return () => clearTimeout(timer);
  }, [user, role, loading]);

  // Fetch registration setting
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
        // الافتراضي false
      }
    };
    fetchSettings();
  }, []);

  // Waiting for role resolution
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
        {isOffline && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>لا يوجد اتصال بالإنترنت — تحقق من الشبكة وحاول مرة أخرى</span>
          </div>
        )}
        <Card className="shadow-elegant animate-slide-up border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-5 pb-2">
            <div className="mx-auto w-20 h-20 gradient-gold rounded-2xl flex items-center justify-center shadow-gold animate-glow">
              <Building2 className="w-10 h-10 text-primary-foreground" />
            </div>
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
              <ResetPasswordForm onBack={() => setResetMode(false)} />
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
                  <LoginForm signIn={signIn} loading={loading} onResetPassword={() => setResetMode(true)} />
                </TabsContent>
                <TabsContent value="signup">
                  <SignupForm signUp={signUp} />
                </TabsContent>
              </Tabs>
            ) : (
              <LoginForm signIn={signIn} loading={loading} onResetPassword={() => setResetMode(true)} idSuffix="-direct" />
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

        <p className="text-center text-primary-foreground/40 text-xs mt-4 font-display">
          ❖ بركة الوقف ❖
        </p>
      </div>
    </div>
  );
};

export default Auth;
