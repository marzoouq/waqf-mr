/**
 * شريط معلومات الوقف — يعرض اسم الوقف مع بيانات تفصيلية عند النقر
 */
import { useState } from 'react';
import { useWaqfInfo } from '@/hooks/page/useAppSettings';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Building2, ScrollText, User, Landmark, Info, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import WaqfInfoEditDialog from '@/components/waqf/WaqfInfoEditDialog';

const FIELDS = [
  { key: 'waqf_name', label: 'اسم الوقف', icon: Building2 },
  { key: 'waqf_founder', label: 'الواقف', icon: User },
  { key: 'waqf_admin', label: 'الناظر', icon: User },
  { key: 'waqf_deed_number', label: 'رقم صك الوقف', icon: ScrollText },
  { key: 'waqf_deed_date', label: 'تاريخ صك الوقف', icon: ScrollText },
  { key: 'waqf_nazara_number', label: 'رقم صك النظارة', icon: ScrollText },
  { key: 'waqf_nazara_date', label: 'تاريخ صك النظارة', icon: ScrollText },
  { key: 'waqf_court', label: 'المحكمة', icon: Landmark },
] as const;

const WaqfInfoBar = () => {
  const { data: waqfInfo, isLoading } = useWaqfInfo();
  const { role } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="w-full px-4 py-2 bg-muted/50">
        <Skeleton className="h-8 w-64 mx-auto" />
      </div>
    );
  }

  if (!waqfInfo?.waqf_name) return null;

  const displayFields = FIELDS.filter((f) => f.key !== 'waqf_name');

  const editInitialData: Record<string, string> = {};
  for (const f of FIELDS) {
    editInitialData[f.key] = waqfInfo[f.key as keyof typeof waqfInfo] ?? '';
  }

  return (
    <>
      <div className="flex-1 gradient-gold px-4 py-2 shadow-sm">
        <div className="flex items-center justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group">
                {waqfInfo.waqf_logo_url ? (
                  <img src={waqfInfo.waqf_logo_url} alt="شعار الوقف" className="w-8 h-8 rounded-lg object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <span className="font-display font-bold text-sm md:text-base text-primary-foreground">
                  {waqfInfo.waqf_name}
                </span>
                <Info className="w-4 h-4 text-primary-foreground/60 group-hover:text-primary-foreground transition-colors" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 md:w-96 max-w-[calc(100vw-2rem)] p-0" align="center" sideOffset={8}>
              <div className="gradient-hero rounded-t-md p-3 flex items-center justify-center gap-2">
                <h3 className="font-display font-bold text-sidebar-foreground text-lg">
                  {waqfInfo.waqf_name}
                </h3>
                {role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="p-4 space-y-3">
                {displayFields.map((field) => {
                  const value = waqfInfo[field.key as keyof typeof waqfInfo];
                  if (!value) return null;
                  return (
                    <div key={field.key} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <field.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{field.label}</p>
                        <p className="text-sm font-medium text-foreground">{value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <WaqfInfoEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        fields={FIELDS}
        initialData={editInitialData}
        currentLogoUrl={waqfInfo.waqf_logo_url || null}
      />
    </>
  );
};

export default WaqfInfoBar;
