import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Building2, LogIn, UserPlus } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error('خطأ في تسجيل الدخول: ' + error.message);
    } else {
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
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
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
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
          <CardDescription>تسجيل الدخول أو إنشاء حساب جديد</CardDescription>
        </CardHeader>
        <CardContent>
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
                <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                  {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
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
                <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                  {loading ? 'جاري التسجيل...' : 'إنشاء حساب'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
