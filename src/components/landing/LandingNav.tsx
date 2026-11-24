/**
 * الشريط العلوي المؤسسي لصفحة الهبوط
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

const LandingNav = ({ waqfName, waqfLogoUrl, ctaText, links, onNavigateAuth }: LandingNavProps) => (
  <nav className="sticky top-0 z-40 bg-primary/95 backdrop-blur border-b border-secondary/30" aria-label="التنقل الرئيسي">
    <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {waqfLogoUrl && (
          <img src={waqfLogoUrl} alt="" className="w-9 h-9 rounded-lg object-contain bg-primary-foreground/10" onError={handleLogoError} />
        )}
        <span className="font-display font-bold text-primary-foreground truncate">{waqfName}</span>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm">
        {links.map(l => (
          <a key={l.href} href={l.href} className="text-primary-foreground/80 hover:text-secondary transition-colors">{l.label}</a>
        ))}
      </div>
      <Button onClick={onNavigateAuth} size="sm" className="gradient-gold text-primary-foreground gap-2 shrink-0">
        <LogIn className="w-4 h-4" />
        {ctaText}
      </Button>
    </div>
  </nav>
);

export default LandingNav;
