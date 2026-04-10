import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, LogIn, UserPlus, Download, Loader2, AlertTriangle } from 'lucide-react';
import { LoginForm, SignupForm, ResetPasswordForm } from '@/components/auth';
import { useSetting } from '@/hooks/data/settings/useAppSettings';
import { useAuthPage } from '@/hooks/page/shared/useAuthPage';

const Auth = () => {
  const waqfLogoUrl = useSetting('waqf_logo_url');
  
  const {
    resetMode, setResetMode, isOffline, isAppInstalled, roleWaitTimeout,
    registrationEnabled, user, role, loading, signIn, signUp, signOut,
    handleInstallClick,
  } = useAuthPage();

  // انتظار تحديد الصلاحيات
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
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" style={{ contain: 'strict' }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" style={{ contain: 'strict' }} />

      <div className="w-full max-w-md relative z-10">
        {isOffline && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>لا يوجد اتصال بالإنترنت — تحقق من الشبكة وحاول مرة أخرى</span>
          </div>
        )}
        <Card className="shadow-elegant animate-slide-up border-border/50 backdrop-blur-xs bg-card/95">
          <CardHeader className="text-center space-y-5 pb-2">
            {waqfLogoUrl ? (
              <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-gold animate-glow bg-white/10 backdrop-blur-xs flex items-center justify-center">
                <img src={waqfLogoUrl} alt="شعار الوقف" className="w-16 h-16 object-contain" loading="eager" />
              </div>
            ) : (
              <div className="mx-auto w-20 h-20 gradient-gold rounded-2xl flex items-center justify-center shadow-gold animate-glow">
                <Building2 className="w-10 h-10 text-primary-foreground" />
              </div>
            )}
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

        {/* زر تثبيت التطبيق */}
        {!isAppInstalled && (
          <Button
            variant="outline"
            className="w-full mt-4 gap-2 bg-card/80 backdrop-blur-xs border-border/50 hover:bg-accent"
            onClick={handleInstallClick}
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
