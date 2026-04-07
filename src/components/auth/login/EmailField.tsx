import { forwardRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  isLoading: boolean;
  idSuffix: string;
}

/** حقل البريد الإلكتروني مع رسائل الخطأ */
const EmailField = forwardRef<HTMLInputElement, EmailFieldProps>(
  ({ value, onChange, onBlur, error, isLoading, idSuffix }, ref) => (
    <div className="space-y-2">
      <Label htmlFor={`signin-email${idSuffix}`}>البريد الإلكتروني</Label>
      <Input
        ref={ref}
        id={`signin-email${idSuffix}`}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="example@email.com"
        dir="ltr"
        className="h-11"
        disabled={isLoading}
        aria-invalid={!!error}
        aria-describedby={error ? `signin-email-error${idSuffix}` : undefined}
      />
      <div className="min-h-[1.25rem]" aria-live="polite">
        {error && (
          <p id={`signin-email-error${idSuffix}`} role="alert" className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  )
);

EmailField.displayName = 'EmailField';
export default EmailField;
