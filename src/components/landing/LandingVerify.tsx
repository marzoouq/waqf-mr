/**
 * التحقق العام من الوثائق برقمها المرجعي — يفتح صفحة التحقق الرسمية
 */
import { useState, type FormEvent } from 'react';
import { SearchCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <section id="verify" className="py-14 md:py-24 gradient-hero pattern-islamic text-primary-foreground scroll-mt-20" aria-labelledby="verify-title">
      <div className="container mx-auto px-5 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div>
          <p className="text-secondary font-bold text-xs md:text-sm mb-2">التحقق العام</p>
          <h2 id="verify-title" className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3">{title}</h2>
          <p className="text-primary-foreground/75 leading-loose text-sm md:text-base">{subtitle}</p>
        </div>
        <form onSubmit={submit} className="rounded-3xl border border-secondary/40 bg-primary-foreground/5 p-5 md:p-8">
          <p className="font-bold text-secondary mb-4">محطة التحقق من المستندات</p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="مثال: DOC-2026-000148"
              aria-label="الرقم المرجعي للوثيقة"
              maxLength={64}
              dir="ltr"
              className="h-12 text-center bg-primary-foreground/10 border-primary-foreground/25 text-primary-foreground placeholder:text-primary-foreground/50"
            />
            <Button type="submit" size="lg" className="h-12 gap-2 gradient-gold text-primary font-bold shrink-0" disabled={!code.trim()}>
              <SearchCheck className="w-5 h-5" />
              تحقّق
            </Button>
          </div>
          <p className="flex items-center gap-2 mt-4 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-xs md:text-sm text-secondary">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            تظهر صحة الوثيقة وتاريخها فقط، دون أي بيانات شخصية
          </p>
        </form>
      </div>
    </section>
  );
};

export default LandingVerify;
