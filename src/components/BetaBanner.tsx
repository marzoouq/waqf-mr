import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { DEFAULT_BANNER_SETTINGS, type BannerSettings } from "@/constants";

const BANNER_COLORS_SPLIT: Record<string, { bg: string; hover: string }> = {
  amber: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600' },
  blue: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  green: { bg: 'bg-green-600', hover: 'hover:bg-green-700' },
  red: { bg: 'bg-red-500', hover: 'hover:bg-red-600' },
  purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600' },
};

const BetaBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const { getJsonSetting, isLoading } = useAppSettings();

  const settings = getJsonSetting<BannerSettings>("beta_banner_settings", DEFAULT_BANNER_SETTINGS);

  if (isLoading || dismissed || !settings.enabled) return null;

  const colors = BANNER_COLORS_SPLIT[settings.color] || BANNER_COLORS_SPLIT.amber;
  const isBottom = settings.position === "bottom";

  return (
    <div
      className={`${isBottom ? "sticky bottom-0" : ""} z-[60] flex items-center justify-center gap-2 ${colors.bg} px-4 py-1.5 text-white text-sm font-medium shadow-md print:hidden`}
    >
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>{settings.text}</span>
      {settings.dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className={`mr-2 rounded p-0.5 ${colors.hover} transition-colors`}
          aria-label="إغلاق"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default BetaBanner;
