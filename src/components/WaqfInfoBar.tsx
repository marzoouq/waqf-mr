import { useWaqfInfo } from '@/hooks/useWaqfInfo';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Building2, ScrollText, User, Landmark, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const WaqfInfoBar = () => {
  const { data: waqfInfo, isLoading } = useWaqfInfo();

  if (isLoading) {
    return (
      <div className="w-full px-4 py-2 bg-muted/50">
        <Skeleton className="h-8 w-64 mx-auto" />
      </div>
    );
  }

  if (!waqfInfo?.waqf_name) return null;

  const details = [
    { icon: User, label: 'الواقف', value: waqfInfo.waqf_founder },
    { icon: User, label: 'الناظر', value: waqfInfo.waqf_admin },
    { icon: ScrollText, label: 'رقم صك الوقف', value: waqfInfo.waqf_deed_number },
    { icon: ScrollText, label: 'تاريخ صك الوقف', value: waqfInfo.waqf_deed_date },
    { icon: ScrollText, label: 'رقم صك النظارة', value: waqfInfo.waqf_nazara_number },
    { icon: ScrollText, label: 'تاريخ صك النظارة', value: waqfInfo.waqf_nazara_date },
    { icon: Landmark, label: 'المحكمة', value: waqfInfo.waqf_court },
  ];

  return (
    <div className="w-full gradient-gold px-4 py-2 shadow-sm">
      <div className="flex items-center justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sm md:text-base text-primary-foreground">
                {waqfInfo.waqf_name}
              </span>
              <Info className="w-4 h-4 text-primary-foreground/60 group-hover:text-primary-foreground transition-colors" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 md:w-96 p-0" align="center" sideOffset={8}>
            <div className="gradient-hero rounded-t-md p-3 text-center">
              <h3 className="font-display font-bold text-sidebar-foreground text-lg">
                {waqfInfo.waqf_name}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {details.map((item, index) => (
                item.value && (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  </div>
                )
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default WaqfInfoBar;
