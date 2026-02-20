import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { DEFAULT_BANNER_SETTINGS, BANNER_COLOR_CLASSES, type BannerSettings } from "@/constants";

const BetaBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const { getJsonSetting, isLoading } = useAppSettings();

  const settings = getJsonSetting<BannerSettings>("beta_banner_settings", DEFAULT_BANNER_SETTINGS);

  if (isLoading || dismissed || !settings.enabled) return null;

  const bg = BANNER_COLOR_CLASSES[settings.color] || BANNER_COLOR_CLASSES.amber;
  const isBottom = settings.position === "bottom";

  return (
    <div
      className={`${isBottom ? "sticky bottom-0" : ""} z-[60] flex items-center justify-center gap-2 ${bg.split(" ")[0]} px-4 py-1.5 text-white text-sm font-medium shadow-md print:hidden`}
    >
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>{settings.text}</span>
      {settings.dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className={`mr-2 rounded p-0.5 ${bg.split(" ")[1] || "hover:bg-black/10"} transition-colors`}
          aria-label="إغلاق"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default BetaBanner;
