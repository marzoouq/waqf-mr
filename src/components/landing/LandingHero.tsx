/**
 * قسم البطل في الصفحة الرئيسية
 */
import { Building2, Star, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LandingPageContent } from '@/types/landing';

/** لون النقش الإسلامي الذهبي — مُربط بـ --secondary للثيم النشط */
const GOLD_PATTERN_COLOR = 'hsl(var(--secondary))';

interface LandingHeroProps {
  content: LandingPageContent;
  waqfLogoUrl?: string;
  stats: { label: string; value: string }[];
  statsLoading: boolean;
  onNavigateAuth: () => void;
}

const LandingHero: React.FC<LandingHeroProps> = ({ content, waqfLogoUrl, stats, statsLoading, onNavigateAuth }) => (
  <header className="relative overflow-hidden gradient-hero min-h-[90vh] flex items-center" role="banner">
    <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
        <defs>
          <pattern id="islamicPattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M60 0L120 60L60 120L0 60Z" fill="none" stroke={GOLD_PATTERN_COLOR} strokeWidth="0.8"/>
            <path d="M60 15L105 60L60 105L15 60Z" fill="none" stroke={GOLD_PATTERN_COLOR} strokeWidth="0.5"/>
            <path d="M60 30L90 60L60 90L30 60Z" fill="none" stroke={GOLD_PATTERN_COLOR} strokeWidth="0.4"/>
            <circle cx="60" cy="60" r="10" fill="none" stroke={GOLD_PATTERN_COLOR} strokeWidth="0.4"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamicPattern)"/>
      </svg>
    </div>
    <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-secondary/5 blur-3xl -translate-x-1/2 -translate-y-1/2" aria-hidden="true" style={{ contain: 'strict' }} />
    <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-secondary/8 blur-3xl translate-x-1/3 translate-y-1/3" aria-hidden="true" style={{ contain: 'strict' }} />
    <div className="container mx-auto px-4 py-10 sm:py-20 relative z-10">
      <div className="text-center max-w-4xl mx-auto">
        <div className="mb-10">
          {waqfLogoUrl ? (
            <div className="mx-auto w-24 h-24 rounded-3xl overflow-hidden shadow-gold animate-glow mb-8 bg-white/10 backdrop-blur-xs flex items-center justify-center">
              <img src={waqfLogoUrl} alt="شعار الوقف" className="w-20 h-20 object-contain" loading="eager" />
            </div>
          ) : (
            <div className="mx-auto w-24 h-24 gradient-gold rounded-3xl flex items-center justify-center shadow-gold animate-glow mb-8">
              <Building2 className="w-12 h-12 text-primary-foreground" />
            </div>
          )}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-16 bg-gradient-to-l from-secondary/60 to-transparent" />
            <Star className="w-4 h-4 text-secondary fill-secondary/30" />
            <div className="h-px w-16 bg-gradient-to-r from-secondary/60 to-transparent" />
          </div>
          <h1 className="font-arabic text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            {content.hero_title}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-4 max-w-2xl mx-auto leading-relaxed font-arabic">
            {content.hero_subtitle}
          </p>
          <p className="text-sm md:text-base text-secondary mb-10 font-arabic font-medium">
            {content.hero_tagline}
          </p>
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <Button
            onClick={onNavigateAuth}
            size="lg"
            className="gradient-gold text-primary-foreground gap-3 shadow-gold hover:scale-105 transition-transform duration-300 text-lg px-10 py-6 rounded-2xl font-bold"
          >
            <ArrowRight className="w-5 h-5" />
            {content.cta_text}
          </Button>
        </div>
        <div className="mt-16 flex justify-center gap-8 md:gap-16 animate-fade-in" style={{ animationDelay: '500ms' }}>
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              {statsLoading ? (
                <Skeleton className="h-10 w-16 mx-auto mb-1 bg-white/20" />
              ) : (
                <div className="text-3xl md:text-4xl font-bold text-gradient-gold font-display">{stat.value}</div>
              )}
              <div className="text-sm text-white/70 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <button
      className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer bg-transparent border-0"
      aria-label="انتقل لقسم الميزات"
      onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
    >
      <ChevronDown className="w-6 h-6 text-white/40" />
    </button>
  </header>
);

export default LandingHero;
