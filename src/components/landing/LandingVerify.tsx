/**
 * التحقق العام من الوثائق برقمها المرجعي — يفتح صفحة التحقق الرسمية
 */
import { useState, type FormEvent } from 'react';
import { SearchCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LandingSection from './LandingSection';

interface LandingVerifyProps {
  title: string;
  subtitle: string;
  onVerify: (code: string) => void;
}

const LandingVerify = ({ title, subtitle, onVerify }: LandingVerifyProps) => {
  const [code, setCode] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) onVerify(code.trim());
  };
  return (
    <LandingSection id="verify" title={title} subtitle={subtitle}>
      <form onSubmit={submit} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3">
        <Input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="الرقم المرجعي للوثيقة"
          aria-label="الرقم المرجعي للوثيقة"
          maxLength={64}
          dir="ltr"
          className="h-12 text-center"
        />
        <Button type="submit" size="lg" className="h-12 gap-2" disabled={!code.trim()}>
          <SearchCheck className="w-5 h-5" />
          تحقق
        </Button>
      </form>
    </LandingSection>
  );
};

export default LandingVerify;
