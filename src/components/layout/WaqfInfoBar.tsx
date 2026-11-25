/**
 * معلومات الوقف — زر (شعار الوقف أو أيقونة) يفتح بطاقة بيانات الصك والنظارة
 * - trigger="logo": شعار الوقف داخل الهيدر الموحّد على الجوال
 * - trigger="icon": زر معلومات صغير في الشريط العلوي على الكمبيوتر
 * كل فرع يغلف زرّه بـ <PopoverTrigger asChild> مباشرة حتى يبقى
 * المعالج مشتقًا من Radix بلا وساطة شرط شرطي بين الغلاف والزّر.
 */
import { useState } from 'react';
import { useWaqfInfo } from '@/hooks/data/settings/app/useAppSettings';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollText, User, Landmark, Info, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { WaqfEmblem } from '@/components/branding/WaqfEmblem';
import WaqfInfoEditDialog from '@/components/waqf-info/WaqfInfoEditDialog';

const FIELDS = [
  { key: 'waqf_name', label: 'اسم الوقف', icon: ScrollText },
  { key: 'waqf_founder', label: 'الواقف', icon: User },
  { key: 'waqf_admin', label: 'الناظر', icon: User },
  { key: 'waqf_deed_number', label: 'رقم صك الوقف', icon: ScrollText },
  { key: 'waqf_deed_date', label: 'تاريخ صك الوقف', icon: ScrollText },
  { key: 'waqf_nazara_number', label: 'رقم صك النظارة', icon: ScrollText },
  { key: 'waqf_nazara_date', label: 'تاريخ صك النظارة', icon: ScrollText },
  { key: 'waqf_court', label: 'المحكمة', icon: Landmark },
] as const;

interface WaqfInfoBarProps {
  trigger?: 'logo' | 'icon';
}

const WaqfInfoBar = ({ trigger = 'logo' }: WaqfInfoBarProps) => {
  const { data: waqfInfo, isLoading } = useWaqfInfo();
  const { role } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  // نمط adjusting-state-during-render الرسمي لإعادة الضبط عند تغيّر الرابط
  const [logoError, setLogoError] = useState(false);
  const [lastLogoUrl, setLastLogoUrl] = useState(waqfInfo?.waqf_logo_url);
  if (lastLogoUrl !== waqfInfo?.waqf_logo_url) {
    setLastLogoUrl(waqfInfo?.waqf_logo_url);
    setLogoError(false);
  }

  if (isLoading) return <Skeleton className="h-9 w-9 rounded-xl" />;
  if (!waqfInfo?.waqf_name) return null;

  const displayFields = FIELDS.filter((f) => f.key !== 'waqf_name');
  const editInitialData: Record<string, string> = {};
  for (const f of FIELDS) {
    editInitialData[f.key] = waqfInfo[f.key as keyof typeof waqfInfo] ?? '';
  }

  return (
    <>
      <Popover>
        {trigger === 'icon' ? (
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="معلومات الوقف" className="waqf-info-bar h-10 w-10 rounded-xl">
              <Info className="w-4 h-4" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
        ) : (
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="معلومات الوقف"
              className="waqf-info-bar w-9 h-9 rounded-xl bg-card flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-sidebar-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
            >
              {waqfInfo.waqf_logo_url && !logoError ? (
                <img
                  src={waqfInfo.waqf_logo_url}
                  alt="شعار الوقف"
                  className="w-full h-full object-contain p-0.5"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <WaqfEmblem size="sm" className="w-full h-full" />
              )}
            </button>
          </PopoverTrigger>
        )}
        <PopoverContent className="w-80 md:w-96 max-w-[calc(100vw-2rem)] p-0 overflow-hidden" align="center" sideOffset={8}>
          <div className="gradient-hero p-3 flex items-center justify-center gap-2">
            <h3 className="font-display font-bold text-sidebar-foreground text-lg">{waqfInfo.waqf_name}</h3>
            {role === 'admin' && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="تعديل معلومات الوقف"
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
                  <div className={cn('w-7 h-7 rounded-md bg-bronze-soft flex items-center justify-center shrink-0 mt-0.5')}>
                    <field.icon className="w-3.5 h-3.5 text-bronze-foreground" />
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
