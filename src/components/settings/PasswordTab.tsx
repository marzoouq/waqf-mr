/**
 * تبويب تغيير كلمة المرور
 */
import { useState, useId } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useChangePassword } from '@/hooks/auth/useChangePassword';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

const PasswordTab = () => {
  const uid = useId();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { changePassword, loading: passwordLoading } = useChangePassword();

  const handlePasswordChange = async () => {
    setErrors({});
    const result = passwordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(e => {
        fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const success = await changePassword(password);
    if (success) {
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Lock className="w-5 h-5" />
          تغيير كلمة المرور
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor={`${uid}-new-password`}>كلمة المرور الجديدة</Label>
          <div className="relative">
            <Input
              id={`${uid}-new-password`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              className="pl-10"
            />
            <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-confirm-password`}>تأكيد كلمة المرور</Label>
          <div className="relative">
            <Input
              id={`${uid}-confirm-password`}
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              className="pl-10"
            />
            <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
        </div>

        <Button onClick={handlePasswordChange} disabled={passwordLoading || !password} className="w-full sm:w-auto">
          {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
          حفظ كلمة المرور
        </Button>
      </CardContent>
    </Card>
  );
};

export default PasswordTab;
