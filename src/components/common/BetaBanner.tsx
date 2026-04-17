import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppSettings } from "@/hooks/data/settings/useAppSettings";
import { DEFAULT_BANNER_SETTINGS, type BannerSettings } from "@/constants";
import { safeSessionGet, safeSessionSet } from "@/lib/storage";

const BANNER_DISMISS_KEY = 'beta_banner_dismissed';

const BANNER_BG: Record<string, string> = {
  amber: 'bg-warning',
  blue: 'bg-info',
  green: 'bg-success',
  red: 'bg-destructive',
  purple: 'bg-status-special',
};

const BANNER_HOVER: Record<string, string> = {
  amber: 'hover:bg-warning/90',
  blue: 'hover:bg-info/90',
  green: 'hover:bg-success/90',
  red: 'hover:bg-destructive/90',
  purple: 'hover:bg-status-special/90',
};

const BetaBanner = () => {
  const [dismissed, setDismissed] = useState(() => safeSessionGet(BANNER_DISMISS_KEY, '') === '1');
  const { getJsonSetting, isLoading } = useAppSettings();

  const settings = getJsonSetting<BannerSettings>("beta_banner_settings", DEFAULT_BANNER_SETTINGS);

  const bgClass = BANNER_BG[settings.color] ?? 'bg-warning';
  const hoverClass = BANNER_HOVER[settings.color] ?? 'hover:bg-warning/90';
  const isBottom = settings.position === "bottom";
  const isHidden = isLoading || dismissed || !settings.enabled;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        isBottom && "fixed bottom-0 left-0 right-0",
        "z-60 flex items-center justify-center gap-2 px-4 py-1.5 text-primary-foreground text-sm font-medium shadow-md print:hidden transition-[height,padding] duration-200",
        !isHidden && bgClass,
      )}
      style={{ minHeight: isBottom ? 0 : 32, height: isHidden ? 0 : 'auto', padding: isHidden ? '0' : undefined, overflow: 'hidden' }}
    >
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>{settings.text}</span>
      {settings.dismissible && (
        <button
          onClick={() => { setDismissed(true); safeSessionSet(BANNER_DISMISS_KEY, '1'); }}
          className={cn("ms-2 rounded p-0.5 transition-colors", hoverClass)}
          aria-label="إغلاق"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default BetaBanner;
