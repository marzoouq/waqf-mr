import { forwardRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

interface NationalIdFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  isLoading: boolean;
  idSuffix: string;
  attemptsRemaining: number | null;
}

/** حقل رقم الهوية الوطنية مع تنبيهات المحاولات */
const NationalIdField = forwardRef<HTMLInputElement, NationalIdFieldProps>(
  ({ value, onChange, error, isLoading, idSuffix, attemptsRemaining }, ref) => (
    <div className="space-y-2">
      <Label htmlFor={`signin-national-id${idSuffix}`}>رقم الهوية الوطنية</Label>
      <Input
        ref={ref}
        id={`signin-national-id${idSuffix}`}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1234567890"
        dir="ltr"
        className="h-11"
        disabled={isLoading}
        aria-invalid={!!error}
        aria-describedby={error ? `signin-nid-error${idSuffix}` : undefined}
      />
      <div className="min-h-[1.25rem]" aria-live="polite">
        {error && (
          <p id={`signin-nid-error${idSuffix}`} role="alert" className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}
        {!error && attemptsRemaining !== null && attemptsRemaining <= 3 && (
          <div className={`flex items-center gap-1.5 text-xs ${
            attemptsRemaining === 0 ? 'text-destructive' : 'text-caution-foreground'
          }`}>
            {attemptsRemaining === 0 ? (
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {attemptsRemaining === 0
                ? 'تم تجاوز حد المحاولات — يرجى الانتظار دقيقتين'
                : `المحاولات المتبقية: ${attemptsRemaining}`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
);

NationalIdField.displayName = 'NationalIdField';
export default NationalIdField;
