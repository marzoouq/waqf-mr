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
import { Building2, LogIn, UserPlus, IdCard, Mail, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'national_id'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { signIn, signUp, user, role, loading } = useAuth();
  const navigate = useNavigate();

  // Show idle logout message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'idle') {
      toast.info('تم تسجيل خروجك تلقائياً بسبب عدم النشاط. يرجى تسجيل الدخول مرة أخرى.');
      window.history.replaceState({}, '', '/auth');
    }
  }, []);

  useEffect(() => {
    if (user && !loading) {
      if (role === 'beneficiary') {
        navigate('/beneficiary');
      } else if (role) {
        navigate('/dashboard');
      }
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'registration_enabled')
        .single();
      if (data) {
        setRegistrationEnabled(data.value === 'true');
      }
    };
    fetchSettings();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let resolvedEmail = loginEmail;

    if (loginMethod === 'national_id') {
      if (!nationalId) {
        toast.error('يرجى إدخال رقم الهوية الوطنية');
        setIsLoading(false);
        return;
      }
      const { data, error: lookupError } = await supabase.functions.invoke('lookup-national-id', {
        body: { national_id: nationalId }
      });

      if (lookupError || !data?.email) {
        toast.error(data?.error || 'رقم الهوية غير مسجل في النظام');
        setIsLoading(false);
        return;
      }
      resolvedEmail = data.email;
    } else {
      if (!resolvedEmail) {
        toast.error('يرجى إدخال البريد الإلكتروني');
        setIsLoading(false);
        return;
      }
    }

    if (!loginPassword) {
      toast.error('يرجى إدخال كلمة المرور');
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(resolvedEmail, loginPassword);
    setIsLoading(false);
    if (error) {
      toast.error('خطأ في تسجيل الدخول: ' + error.message);
    } else {
      toast.success('تم تسجيل الدخول بنجاح');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (signupPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword);
    setIsLoading(false);
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('هذا البريد الإلكتروني مسجل بالفعل');
      } else {
        toast.error('خطأ في التسجيل: ' + error.message);
      }
    } else {
      toast.success('تم التسجيل بنجاح! يرجى تأكيد بريدك الإلكتروني');
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
    </form>
  );

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
                    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                      redirectTo: `${window.location.origin}/auth`,
                    });
                    setIsLoading(false);
                    if (error) { toast.error('حدث خطأ: ' + error.message); }
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

        {/* Footer text */}
        <p className="text-center text-primary-foreground/40 text-xs mt-6 font-display">
          ❖ بركة الوقف ❖
        </p>
      </div>
    </div>
  );
};

export default Auth;
