import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus, Download, Loader2, AlertTriangle, Home, ShieldCheck } from 'lucide-react';
import { LoginForm, SignupForm, ResetPasswordForm } from '@/components/auth';
import { useAuthPage } from '@/hooks/application/useAuthPage';
import { RouteHead } from '@/components/seo/RouteHead';

const AuthBranding = lazy(() => import('@/components/auth/AuthBranding'));

const Auth = () => {
  const {
    resetMode, setResetMode, isOffline, isAppInstalled, roleWaitTimeout,
    registrationEnabled, user, role, loading, signIn, signUp, signOut,
    handleInstallClick, waqfLogoUrl,
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
              <Button variant="outline" onClick={() => signOut()}>
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
    <div className="min-h-[100dvh] gradient-auth pattern-islamic-strong flex flex-col relative overflow-hidden" dir="rtl">
      <RouteHead
        title="تسجيل الدخول"
        description="بوّابة دخول نظام إدارة وقف مرزوق بن علي الثبيتي — تسجيل دخول الناظر والمحاسب والمستفيدين والواقفين بطرق آمنة، مع دعم المصادقة البيومترية."
        path="/auth"
      />
      {/* هالات زخرفية */}
      <div className="pointer-events-none absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl" style={{ contain: 'strict' }} />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/20 blur-3xl" style={{ contain: 'strict' }} />

      {/* الشريط العلوي */}
      <header className="relative z-10 border-b border-secondary/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/10">
            <Link to="/" aria-label="العودة للصفحة الرئيسية">
              <Home className="w-4 h-4" />
              الصفحة الرئيسية
            </Link>
          </Button>
          <span className="flex items-center gap-1.5 rounded-full border border-secondary/40 bg-card/70 px-3 py-1 text-xs text-secondary">
            <ShieldCheck className="w-3.5 h-3.5" />
            اتصال آمن ومشفّر
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {isOffline && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>لا يوجد اتصال بالإنترنت — تحقق من الشبكة وحاول مرة أخرى</span>
            </div>
          )}

          <Card className="overflow-hidden rounded-3xl border-secondary/40 bg-card/97 shadow-elegant animate-slide-up">
            <div className="h-1.5 gradient-gold" aria-hidden="true" />
            <CardHeader className="text-center space-y-4 pb-2 pt-7">
              <div className="mx-auto rounded-full border-2 border-secondary/50 p-1.5 shadow-gold">
                <Suspense fallback={<div className="w-20 h-20 rounded-2xl bg-muted" />}>
                  <AuthBranding waqfLogoUrl={waqfLogoUrl} />
                </Suspense>
              </div>
              <div className="space-y-1.5">
                <CardTitle className="text-2xl sm:text-3xl font-display font-bold text-primary">
                  بوّابة الدخول الموحّدة
                </CardTitle>
                <p className="text-sm text-muted-foreground font-display">وقف مرزوق بن علي الثبيتي — رحمه الله</p>
                <div className="ornament-divider py-1.5">
                  <span className="text-gradient-gold text-sm font-display px-4">❖</span>
                </div>
                <CardDescription className="text-sm">
                  {registrationEnabled ? 'سجّل دخولك أو أنشئ حسابًا جديدًا' : 'سجّل دخولك للوصول إلى خدماتك'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-5 sm:px-8 pb-7 pt-3">
              {resetMode ? (
                <ResetPasswordForm onBack={() => setResetMode(false)} />
              ) : registrationEnabled ? (
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-11 rounded-full">
                    <TabsTrigger value="signin" className="gap-2 text-sm rounded-full">
                      <LogIn className="w-4 h-4" />
                      تسجيل الدخول
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="gap-2 text-sm rounded-full">
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

          {!isAppInstalled && (
            <Button
              variant="outline"
              className="w-full mt-4 gap-2 rounded-full border-secondary/40 bg-card/85 hover:bg-accent"
              onClick={handleInstallClick}
            >
              <Download className="w-4 h-4" />
              تثبيت التطبيق على جوالك
            </Button>
          )}
        </div>
      </main>

      <footer className="relative z-10 pb-5 text-center text-xs text-muted-foreground font-display">
        ❖ نظام إدارة الوقف — أمانةٌ تُحفظ، وريعٌ يُصان ❖
      </footer>
    </div>
  );
};

export default Auth;
