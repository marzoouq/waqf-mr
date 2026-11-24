/**
 * غلاف مشترك لأقسام صفحة الهبوط: عنوان مزخرف + وصف — يمنع تكرار التخطيط.
 */
import type { ReactNode } from 'react';

interface LandingSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}

const LandingSection = ({ id, title, subtitle, className = '', children }: LandingSectionProps) => (
  <section id={id} className={`py-16 md:py-24 ${className}`} aria-labelledby={`${id}-title`}>
    <div className="container mx-auto px-4">
      <div className="text-center mb-10 md:mb-14">
        <div className="flex items-center justify-center gap-3 mb-4" aria-hidden="true">
          <span className="h-px w-12 bg-secondary/50" />
          <span className="text-secondary text-sm">✦</span>
          <span className="h-px w-12 bg-secondary/50" />
        </div>
        <h2 id={`${id}-title`} className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">{title}</h2>
        {subtitle && <p className="text-muted-foreground max-w-xl mx-auto">{subtitle}</p>}
      </div>
      {children}
    </div>
  </section>
);

export default LandingSection;
