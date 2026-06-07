/**
 * قسم الدعوة للعمل في الصفحة الرئيسية
 */
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingPageContent } from '@/types/landing';

interface LandingCTAProps {
  content: LandingPageContent;
  onNavigateAuth: () => void;
}

const LandingCTA: React.FC<LandingCTAProps> = ({ content, onNavigateAuth }) => (
  <section className="py-16 gradient-primary pattern-islamic relative overflow-hidden" aria-label="دعوة للبدء">
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/20" aria-hidden="true" />
    <div className="container mx-auto px-4 text-center relative z-10">
      <h3 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
        {content.cta_section_title}
      </h3>
      <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
        {content.cta_section_subtitle}
      </p>
      <Button
        onClick={onNavigateAuth}
        onMouseEnter={() => { void import('@/pages/Auth'); }}
        onTouchStart={() => { void import('@/pages/Auth'); }}
        size="lg"
        variant="outline"
        className="gap-2 bg-transparent border-2 border-secondary/60 text-secondary hover:bg-secondary hover:text-primary transition-colors duration-300 rounded-xl font-bold px-8"
      >
        <LogIn className="w-5 h-5" />
        لديك حساب؟ سجّل دخولك
      </Button>
    </div>
  </section>
);

export default LandingCTA;
