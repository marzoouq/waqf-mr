/**
 * غلاف مشترك لأقسام صفحة الهبوط: عنوان صغير + عنوان + وصف بمحاذاة الهوية المؤسسية.
 */
import type { ReactNode } from 'react';

interface LandingSectionProps {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  dark?: boolean;
  children: ReactNode;
}

const LandingSection = ({ id, eyebrow, title, subtitle, className = '', dark = false, children }: LandingSectionProps) => (
  <section id={id} className={`py-14 md:py-24 scroll-mt-20 ${className}`} aria-labelledby={`${id}-title`}>
    <div className="container mx-auto px-5">
      <div className="mb-8 md:mb-12">
        {eyebrow && <p className="text-secondary font-bold text-xs md:text-sm mb-2">{eyebrow}</p>}
        <h2 id={`${id}-title`} className={`font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 ${dark ? 'text-primary-foreground' : 'text-primary'}`}>{title}</h2>
        {subtitle && <p className={`max-w-xl leading-loose text-sm md:text-base ${dark ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{subtitle}</p>}
      </div>
      {children}
    </div>
  </section>
);

export default LandingSection;
