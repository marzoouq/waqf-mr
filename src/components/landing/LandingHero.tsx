/**
 * قسم البطل المؤسسي: نص وأزرار في جهة، وختم الوقف الدائري في الجهة الأخرى
 */
import { ArrowLeft, Building2, SearchCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LandingPageContent } from '@/types/landing';
import { handleLogoError } from '@/lib/branding/logoFallback';

interface LandingHeroProps {
  content: LandingPageContent;
  waqfLogoUrl?: string;
  stats: { label: string; value: string }[];
  statsLoading: boolean;
  onNavigateAuth: () => void;
}

const LandingHero: React.FC<LandingHeroProps> = ({ content, waqfLogoUrl, stats, statsLoading, onNavigateAuth }) => (
  <>
    <header className={`relative overflow-hidden gradient-hero pattern-islamic text-primary-foreground ${stats.length ? 'pb-24 md:pb-32' : 'pb-14 md:pb-24'} pt-10 md:pt-20`} role="banner">
      <div className="container mx-auto px-5 grid md:grid-cols-[1.15fr_.85fr] gap-10 md:gap-14 items-center relative z-10">
        <div className="text-center md:text-right">
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 text-secondary px-3.5 py-1.5 text-xs md:text-sm">
            ✦ {content.hero_tagline}
          </span>
          <h1 className="font-display font-bold text-[1.75rem] leading-snug sm:text-4xl md:text-5xl lg:text-6xl md:leading-tight mt-5 mb-4">
            {content.hero_title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg leading-loose text-primary-foreground/80 max-w-xl mx-auto md:mx-0">
            {content.hero_subtitle}
          </p>
          <div className="flex gap-3 mt-7 flex-wrap justify-center md:justify-start">
            <Button onClick={onNavigateAuth} size="lg" className="gradient-gold text-primary gap-2 rounded-xl font-bold shadow-gold flex-1 sm:flex-none">
              {content.cta_text}
              <ArrowLeft className="w-4 h-4" />
            </Button>
            {content.show_verify && (
              <Button asChild size="lg" variant="outline" className="bg-transparent border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary gap-2 rounded-xl font-bold flex-1 sm:flex-none">
                <a href="#verify"><SearchCheck className="w-4 h-4" />تحقّق من وثيقة</a>
              </Button>
            )}
          </div>
        </div>
        <div className="relative mx-auto w-56 sm:w-64 md:w-full md:max-w-sm aspect-square rounded-full border-2 border-secondary/50 grid place-items-center bg-[radial-gradient(circle,hsl(var(--secondary)/0.15),transparent_70%)]" aria-hidden="true">
          <div className="absolute inset-4 md:inset-6 rounded-full border border-dashed border-secondary/50" />
          <div className="w-[46%] aspect-square rounded-3xl bg-background p-3 shadow-2xl grid place-items-center">
            {waqfLogoUrl
              ? <img src={waqfLogoUrl} alt="" className="w-full h-full object-contain" loading="eager" onError={handleLogoError} />
              : <Building2 className="w-1/2 h-1/2 text-primary" />}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent" />
    </header>
    {stats.length > 0 && (
      <div className="container mx-auto px-5 -mt-14 md:-mt-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-2xl bg-card border border-secondary/30 shadow-xl overflow-hidden divide-x divide-x-reverse divide-border">
          {stats.map(stat => (
            <div key={stat.label} className="p-5 md:p-7 text-center border-t border-border md:border-t-0">
              {statsLoading
                ? <Skeleton className="h-9 w-14 mx-auto mb-1" />
                : <div className="font-display text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>}
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    )}
  </>
);

export default LandingHero;
