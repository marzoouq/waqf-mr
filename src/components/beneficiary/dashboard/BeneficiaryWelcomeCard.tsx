import { Sun, Moon } from 'lucide-react';
import type { GreetingData } from '@/hooks/ui/useGreeting';

interface BeneficiaryWelcomeCardProps {
  displayName: string;
  roleLabel: string;
  greetingData: GreetingData;
}

/** تحية مختصرة أعلى لوحة المستفيد — بلا بطاقة حتى تبقى الحصة هي الأبرز */
const BeneficiaryWelcomeCard = ({ displayName, roleLabel, greetingData }: BeneficiaryWelcomeCardProps) => {
  const { greeting, greetingIconName, hijriDate, gregorianDate } = greetingData;
  const GreetingIcon = greetingIconName === 'sun' ? Sun : Moon;

  return (
    <header className="flex items-end justify-between gap-3 px-1 animate-fade-in">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <GreetingIcon className="h-4 w-4 text-secondary" aria-hidden="true" />
          {greeting}
        </p>
        <h1 className="mt-0.5 text-xl sm:text-2xl font-bold text-foreground truncate">{displayName}</h1>
        <p className="sr-only">{roleLabel}</p>
      </div>
      <p className="hidden sm:block text-xs text-muted-foreground text-left shrink-0 tabular-nums">
        {hijriDate}
        <span className="block">{gregorianDate}</span>
      </p>
    </header>
  );
};

export default BeneficiaryWelcomeCard;
