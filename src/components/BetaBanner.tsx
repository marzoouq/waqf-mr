import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { DEFAULT_BANNER_SETTINGS, type BannerSettings } from "@/constants";

const BANNER_DISMISS_KEY = 'beta_banner_dismissed';

const BANNER_COLORS_SPLIT: Record<string, { bg: string; hover: string }> = {
  amber: { bg: 'bg-warning', hover: 'hover:bg-warning/90' },
  blue: { bg: 'bg-info', hover: 'hover:bg-info/90' },
  green: { bg: 'bg-success', hover: 'hover:bg-success/90' },
  red: { bg: 'bg-destructive', hover: 'hover:bg-destructive/90' },
  purple: { bg: 'bg-status-special', hover: 'hover:bg-status-special/90' },
};

const BetaBanner = () => {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(BANNER_DISMISS_KEY) === '1');
  const { getJsonSetting, isLoading } = useAppSettings();

  const settings = getJsonSetting<BannerSettings>("beta_banner_settings", DEFAULT_BANNER_SETTINGS);

  const colors = BANNER_COLORS_SPLIT[settings.color] || BANNER_COLORS_SPLIT.amber;
  const isBottom = settings.position === "bottom";
  const isHidden = isLoading || dismissed || !settings.enabled;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${isBottom ? "fixed bottom-0 left-0 right-0" : ""} z-[60] flex items-center justify-center gap-2 ${isHidden ? '' : colors.bg} px-4 py-1.5 text-white text-sm font-medium shadow-md print:hidden transition-all duration-200`}
      style={{ minHeight: isBottom ? 0 : 32, height: isHidden ? 0 : 'auto', padding: isHidden ? '0' : undefined, overflow: 'hidden' }}
    >
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>{settings.text}</span>
      {settings.dismissible && (
        <button
          onClick={() => { setDismissed(true); sessionStorage.setItem(BANNER_DISMISS_KEY, '1'); }}
          className={`ms-2 rounded p-0.5 ${colors.hover} transition-colors`}
          aria-label="إغلاق"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default BetaBanner;
