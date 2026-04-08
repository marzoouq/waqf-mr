import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthBarProps {
  password: string;
}

/** مكوّن توجيهي لعرض قوة كلمة المرور */
export default function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const checks = useMemo(() => [
    { label: '٨ أحرف على الأقل', pass: password.length >= 8 },
    { label: 'حرف كبير', pass: /[A-Z]/.test(password) },
    { label: 'رقم', pass: /\d/.test(password) },
    { label: 'رمز خاص', pass: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const score = checks.filter((c) => c.pass).length;

  if (!password) return <div className="min-h-[3.5rem]" />;

  const strengthLabel = score <= 1 ? 'ضعيفة' : score <= 2 ? 'متوسطة' : score <= 3 ? 'جيدة' : 'قوية';
  const strengthColor = score <= 1 ? 'bg-destructive' : score <= 2 ? 'bg-warning' : score <= 3 ? 'bg-warning/70' : 'bg-success';

  return (
    <div className="space-y-2 min-h-[3.5rem]">
      {/* شريط القوة */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? strengthColor : 'bg-muted'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">قوة كلمة المرور: <strong>{strengthLabel}</strong></span>
      </div>
      {/* قائمة المعايير */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={`flex items-center gap-1 text-[11px] ${c.pass ? 'text-green-600' : 'text-muted-foreground'}`}>
            {c.pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
