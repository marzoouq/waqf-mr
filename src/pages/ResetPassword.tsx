import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Building2, KeyRound, Loader2, CheckCircle } from 'lucide-react';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Fallback: check URL hash for type=recovery (legacy implicit flow)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // BUG-6 fix: Also check query params for PKCE flow (Supabase v2+)
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'recovery') {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(getSafeErrorMessage(error));
      } else {
        setSuccess(true);
        toast.success('تم تغيير كلمة المرور بنجاح');
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen gradient-auth pattern-islamic-strong flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 gradient-gold rounded-2xl flex items-center justify-center shadow-gold">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl font-display">رابط غير صالح</CardTitle>
            <CardDescription>
              هذا الرابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد من صفحة تسجيل الدخول.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full h-11 gradient-primary" onClick={() => navigate('/auth')}>
              العودة لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen gradient-auth pattern-islamic-strong flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-accent rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl font-display">تم التغيير بنجاح</CardTitle>
            <CardDescription>
              تم تغيير كلمة المرور بنجاح.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full h-11 gradient-primary" onClick={() => navigate('/auth')}>
              العودة لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-auth pattern-islamic-strong flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-elegant border-border/50 backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 gradient-gold rounded-2xl flex items-center justify-center shadow-gold">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">إعادة تعيين كلمة المرور</CardTitle>
          <CardDescription>أدخل كلمة المرور الجديدة</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="h-11"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="h-11"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-11 gradient-primary text-base font-medium" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري التغيير...</>
              ) : (
                'تغيير كلمة المرور'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
