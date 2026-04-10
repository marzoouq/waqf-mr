import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Sun, Moon } from 'lucide-react';
import { useGreeting } from '@/hooks/ui/useGreeting';

interface BeneficiaryWelcomeCardProps {
  displayName: string;
  roleLabel: string;
}

const BeneficiaryWelcomeCard = ({ displayName, roleLabel }: BeneficiaryWelcomeCardProps) => {
  const { greeting, greetingIconName, hijriDate, gregorianDate, timeStr } = useGreeting();
  const GreetingIcon = greetingIconName === 'sun' ? Sun : Moon;

  return (
    <Card className="overflow-hidden border-0 shadow-lg gradient-primary text-primary-foreground animate-slide-up">
      <CardContent className="p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <GreetingIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base text-primary-foreground/80">{greeting}</p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">
                {displayName}
              </h1>
              <p className="text-xs sm:text-sm text-primary-foreground/70 mt-0.5">{roleLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-primary-foreground/85 shrink-0">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{hijriDate}</span>
            <span className="hidden sm:inline text-primary-foreground/40">|</span>
            <span>{gregorianDate}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{timeStr}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BeneficiaryWelcomeCard;
