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
import { Building2, LogIn, UserPlus, IdCard, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'national_id'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const { signIn, signUp, user, role, loading } = useAuth();
  const navigate = useNavigate();

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

    let loginEmail = email;

    if (loginMethod === 'national_id') {
      if (!nationalId) {
        toast.error('يرجى إدخال رقم الهوية الوطنية');
        setIsLoading(false);
        return;
      }
      // Lookup email by national_id
      const { data: beneficiary, error: lookupError } = await supabase
        .from('beneficiaries')
        .select('email')
        .eq('national_id', nationalId)
        .single();

      if (lookupError || !beneficiary?.email) {
        toast.error('رقم الهوية غير مسجل في النظام');
        setIsLoading(false);
        return;
      }
      loginEmail = beneficiary.email;
    } else {
      if (!loginEmail) {
        toast.error('يرجى إدخال البريد الإلكتروني');
        setIsLoading(false);
        return;
      }
    }

    if (!password) {
      toast.error('يرجى إدخال كلمة المرور');
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(loginEmail, password);
    setIsLoading(false);
    if (error) {
      toast.error('خطأ في تسجيل الدخول: ' + error.message);
    } else {
      toast.success('تم تسجيل الدخول بنجاح');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password);
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

  return (
    <div className="min-h-screen gradient-hero pattern-islamic flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant animate-slide-up">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">نظام إدارة الوقف</CardTitle>
          <CardDescription>
            {registrationEnabled ? 'تسجيل الدخول أو إنشاء حساب جديد' : 'تسجيل الدخول'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registrationEnabled ? (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </TabsTrigger>
                <TabsTrigger value="signup" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  حساب جديد
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-3">
                    <Label>طريقة تسجيل الدخول</Label>
                    <RadioGroup
                      value={loginMethod}
                      onValueChange={(v) => setLoginMethod(v as 'email' | 'national_id')}
                      className="flex gap-4"
                      dir="rtl"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="email" id="method-email" />
                        <Label htmlFor="method-email" className="flex items-center gap-1 cursor-pointer">
                          <Mail className="w-4 h-4" />
                          البريد الإلكتروني
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="national_id" id="method-id" />
                        <Label htmlFor="method-id" className="flex items-center gap-1 cursor-pointer">
                          <IdCard className="w-4 h-4" />
                          رقم الهوية
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {loginMethod === 'email' ? (
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        dir="ltr"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="signin-national-id">رقم الهوية الوطنية</Label>
                      <Input
                        id="signin-national-id"
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="1234567890"
                        dir="ltr"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">كلمة المرور</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                    {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">كلمة المرور</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                    {isLoading ? 'جاري التسجيل...' : 'إنشاء حساب'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-3">
                <Label>طريقة تسجيل الدخول</Label>
                <RadioGroup
                  value={loginMethod}
                  onValueChange={(v) => setLoginMethod(v as 'email' | 'national_id')}
                  className="flex gap-4"
                  dir="rtl"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="email" id="method-email-direct" />
                    <Label htmlFor="method-email-direct" className="flex items-center gap-1 cursor-pointer">
                      <Mail className="w-4 h-4" />
                      البريد الإلكتروني
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="national_id" id="method-id-direct" />
                    <Label htmlFor="method-id-direct" className="flex items-center gap-1 cursor-pointer">
                      <IdCard className="w-4 h-4" />
                      رقم الهوية
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {loginMethod === 'email' ? (
                <div className="space-y-2">
                  <Label htmlFor="signin-email-direct">البريد الإلكتروني</Label>
                  <Input
                    id="signin-email-direct"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    dir="ltr"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="signin-national-id-direct">رقم الهوية الوطنية</Label>
                  <Input
                    id="signin-national-id-direct"
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="1234567890"
                    dir="ltr"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="signin-password-direct">كلمة المرور</Label>
                <Input
                  id="signin-password-direct"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
