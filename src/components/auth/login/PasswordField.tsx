import { forwardRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  isLoading: boolean;
  idSuffix: string;
  onResetPassword: () => void;
}

/** حقل كلمة المرور مع زر الإظهار/الإخفاء ورابط نسيت كلمة المرور */
const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ value, onChange, error, isLoading, idSuffix, onResetPassword }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`signin-password${idSuffix}`}>كلمة المرور</Label>
          <div className="relative">
            <Input
              ref={ref}
              id={`signin-password${idSuffix}`}
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="••••••••"
              dir="ltr"
              autoComplete="current-password"
              className="h-11 pe-10"
              disabled={isLoading}
              aria-invalid={!!error}
              aria-describedby={error ? `signin-password-error${idSuffix}` : undefined}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="min-h-[1.25rem]" aria-live="polite">
            {error && (
              <p id={`signin-password-error${idSuffix}`} role="alert" className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <Button
            type="button"
            variant="link"
            className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
            onClick={onResetPassword}
          >
            <KeyRound className="w-3.5 h-3.5 ml-1" />
            نسيت كلمة المرور؟
          </Button>
        </div>
      </>
    );
  }
);

PasswordField.displayName = 'PasswordField';
export default PasswordField;
