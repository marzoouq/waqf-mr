import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, KeyRound, Loader2, CheckCircle } from 'lucide-react';
import { useResetPassword } from '@/hooks/auth/useResetPassword';

const ResetPassword = () => {
  const navigate = useNavigate();
  const {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    isLoading, isRecovery, success,
    handleSubmit,
  } = useResetPassword();

  if (!isRecovery) {
    return (
      <div className="min-h-screen gradient-auth pattern-islamic-strong flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-elegant border-border/50 backdrop-blur-xs bg-card/95">
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
        <Card className="w-full max-w-md shadow-elegant border-border/50 backdrop-blur-xs bg-card/95">
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
      <Card className="w-full max-w-md shadow-elegant border-border/50 backdrop-blur-xs bg-card/95">
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
