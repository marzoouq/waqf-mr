/**
 * بطاقة الترحيب في لوحة الواقف
 */
import { Card, CardContent } from '@/components/ui/card';
import type { ReactNode } from 'react';
import { Calendar, Clock, Sun, Moon } from 'lucide-react';

export interface WelcomeData {
  greeting: string;
  greetingIconName: 'sun' | 'moon';
  hijriDate: string;
  gregorianDate: string;
  timeStr: string;
}

interface WaqifWelcomeCardProps {
  displayName: string;
  welcome: WelcomeData;
  actions?: ReactNode;
}

const iconMap = { sun: Sun, moon: Moon } as const;

const WaqifWelcomeCard = ({ displayName, welcome, actions }: WaqifWelcomeCardProps) => {
  const { greeting, greetingIconName, hijriDate, gregorianDate, timeStr } = welcome;
  const GreetingIcon = iconMap[greetingIconName];
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg gradient-hero waqf-frame text-primary-foreground animate-slide-up">
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-sidebar-primary/20" aria-hidden="true" />
      <CardContent className="relative p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-sidebar-primary/20 ring-1 ring-sidebar-primary/40 flex items-center justify-center shrink-0"><GreetingIcon className="w-6 h-6 sm:w-7 sm:h-7 text-sidebar-primary" /></div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base text-primary-foreground/80">{greeting}</p>
              <h1 className="text-display-md font-display truncate">{displayName}</h1>
              <p className="text-xs sm:text-sm text-primary-foreground/70 mt-0.5">لوحة متابعة الوقف</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-primary-foreground/85 shrink-0">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{hijriDate}</span>
            <span className="hidden sm:inline text-primary-foreground/40">|</span>
            <span>{gregorianDate}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{timeStr}</span>
            {actions && <div className="flex items-center gap-2 print:hidden [&_button]:border-primary-foreground/25 [&_button]:bg-primary-foreground/10 [&_button]:text-primary-foreground">{actions}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaqifWelcomeCard;
