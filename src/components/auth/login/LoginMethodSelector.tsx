import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mail, IdCard } from 'lucide-react';

interface LoginMethodSelectorProps {
  loginMethod: 'email' | 'national_id';
  onChange: (method: 'email' | 'national_id') => void;
  isLoading: boolean;
  idSuffix: string;
}

/** محدد طريقة تسجيل الدخول — بريد أو هوية */
export default function LoginMethodSelector({ loginMethod, onChange, isLoading, idSuffix }: LoginMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <Label id="login-method-label" className="text-sm font-medium">طريقة تسجيل الدخول</Label>
      <RadioGroup
        value={loginMethod}
        onValueChange={(v) => onChange(v as 'email' | 'national_id')}
        className="flex flex-wrap gap-3"
        dir="rtl"
        disabled={isLoading}
      >
        <label
          htmlFor={`method-email${idSuffix}`}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
            loginMethod === 'email'
              ? 'border-primary bg-accent shadow-sm'
              : 'border-border hover:border-primary/30'
          } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <RadioGroupItem value="email" id={`method-email${idSuffix}`} />
          <Mail className="w-4 h-4" />
          <span className="text-sm">البريد الإلكتروني</span>
        </label>
        <label
          htmlFor={`method-id${idSuffix}`}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
            loginMethod === 'national_id'
              ? 'border-primary bg-accent shadow-sm'
              : 'border-border hover:border-primary/30'
          } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <RadioGroupItem value="national_id" id={`method-id${idSuffix}`} />
          <IdCard className="w-4 h-4" />
          <span className="text-sm">رقم الهوية</span>
        </label>
      </RadioGroup>
    </div>
  );
}
