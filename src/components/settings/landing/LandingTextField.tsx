/**
 * حقل نصي موحّد لإعدادات صفحة الهبوط — يمنع تكرار Label/Input
 */
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { LandingPageContent, LandingTextKey } from '@/types/landing';

interface LandingTextFieldProps {
  field: LandingTextKey;
  label: string;
  form: LandingPageContent;
  onChange: (key: LandingTextKey, value: string) => void;
  maxLength: number;
  multiline?: boolean;
  placeholder?: string;
}

const LandingTextField = ({ field, label, form, onChange, maxLength, multiline, placeholder }: LandingTextFieldProps) => {
  const id = `landing-field-${field}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea id={id} name={field} value={form[field]} onChange={e => onChange(field, e.target.value)} maxLength={maxLength} rows={3} />
      ) : (
        <Input id={id} name={field} value={form[field]} onChange={e => onChange(field, e.target.value)} maxLength={maxLength} placeholder={placeholder} />
      )}
    </div>
  );
};

export default LandingTextField;
