/**
 * الترويسة المؤسسية لصفحة الهبوط: شريط التاريخ + شريط عاجي بالشعار والروابط
 */
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleLogoError } from '@/lib/branding/logoFallback';

interface LandingNavProps {
  waqfName: string;
  waqfLogoUrl?: string;
  ctaText: string;
  links: { href: string; label: string }[];
  onNavigateAuth: () => void;
}

const todayLabel = () => {
  const d = new Date();
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  const greg = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  return `${hijri} · ${greg}`;
};

const LandingNav = ({ waqfName, waqfLogoUrl, ctaText, links, onNavigateAuth }: LandingNavProps) => (
  <>
    <div className="bg-primary text-secondary text-[11px] md:text-xs py-1.5">
      <div className="container mx-auto px-5 flex justify-between gap-2">
        <span className="truncate">{todayLabel()}</span>
        <span className="hidden md:inline">منصة رسمية موثقة لإدارة الوقف</span>
      </div>
    </div>
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-secondary/30" aria-label="التنقل الرئيسي">
      <div className="container mx-auto px-5 h-16 md:h-[72px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {waqfLogoUrl && (
            <img src={waqfLogoUrl} alt="" className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl object-contain bg-card border border-secondary p-0.5" onError={handleLogoError} />
          )}
          <div className="min-w-0 leading-tight">
            <span className="block font-display font-bold text-primary text-sm sm:text-base md:text-xl truncate">{waqfName}</span>
            <span className="block text-muted-foreground text-[10px] md:text-xs">نظارة الوقف · رحمه الله</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-primary/80 hover:text-secondary transition-colors">{l.label}</a>
          ))}
        </div>
        <Button onClick={onNavigateAuth} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0 rounded-xl">
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">{ctaText}</span>
          <span className="sm:hidden">دخول</span>
        </Button>
      </div>
    </nav>
  </>
);

export default LandingNav;
