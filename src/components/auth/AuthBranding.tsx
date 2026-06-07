/**
 * علامة Auth — Hero/Logo مُستخرج كـ lazy لتسريع FCP.
 */
import { Building2 } from 'lucide-react';

interface Props {
  waqfLogoUrl?: string;
}

export default function AuthBranding({ waqfLogoUrl }: Props) {
  return waqfLogoUrl ? (
    <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden shadow-gold animate-glow bg-white/10 backdrop-blur-xs flex items-center justify-center">
      <img src={waqfLogoUrl} alt="شعار الوقف" className="w-16 h-16 object-contain" loading="eager" />
    </div>
  ) : (
    <div className="mx-auto w-20 h-20 gradient-gold rounded-2xl flex items-center justify-center shadow-gold animate-glow">
      <Building2 className="w-10 h-10 text-primary-foreground" />
    </div>
  );
}
