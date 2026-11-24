/**
 * WaqfEmblem — الشعار الرسمي للوقف بهالة ذهبية؛ البديل الثابت حين لا يتوفر شعار مخصص.
 */
import { cn } from '@/lib/cn';
import { LOCAL_LOGO_URL, handleLogoError } from '@/lib/branding/logoFallback';

export const OFFICIAL_LOGO_SRC = LOCAL_LOGO_URL;

interface WaqfEmblemProps {
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'w-11 h-11', md: 'w-16 h-16', lg: 'w-20 h-20' } as const;

export function WaqfEmblem({ src, size = 'md', className }: WaqfEmblemProps) {
  return (
    <span className={cn('relative inline-flex items-center justify-center shrink-0', SIZES[size], className)}>
      <span aria-hidden="true" className="absolute inset-0 rounded-full bg-secondary/30 blur-md" />
      <img
        src={src || OFFICIAL_LOGO_SRC}
        alt="شعار الوقف"
        className="relative w-full h-full object-contain drop-shadow"
        loading="eager"
        onError={handleLogoError}
      />
    </span>
  );
}

export default WaqfEmblem;
