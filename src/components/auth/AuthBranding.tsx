/**
 * علامة Auth — الشعار الرسمي دائماً (المخصص إن وُجد، وإلا /logo.png) دون أيقونة عامة.
 */
import { WaqfEmblem } from '@/components/branding/WaqfEmblem';

interface Props {
  waqfLogoUrl?: string;
}

export default function AuthBranding({ waqfLogoUrl }: Props) {
  return <WaqfEmblem src={waqfLogoUrl} size="lg" className="mx-auto animate-glow" />;
}
