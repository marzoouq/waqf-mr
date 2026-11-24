/**
 * ميثاق الوقف — نص يحرره الناظر
 */
import { ScrollText } from 'lucide-react';
import LandingSection from './LandingSection';

interface LandingTestamentProps {
  title: string;
  text: string;
}

const LandingTestament = ({ title, text }: LandingTestamentProps) => (
  <LandingSection id="testament" title={title}>
    <figure className="max-w-3xl mx-auto rounded-3xl border-2 border-secondary/40 bg-card p-8 md:p-12 text-center shadow-sm">
      <ScrollText className="w-10 h-10 text-secondary mx-auto mb-6" aria-hidden="true" />
      <blockquote className="font-arabic text-xl md:text-2xl leading-loose text-foreground">{text}</blockquote>
    </figure>
  </LandingSection>
);

export default LandingTestament;
