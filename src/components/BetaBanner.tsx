import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

interface BannerSettings {
  enabled: boolean;
  text: string;
  color: string;
  position: string;
  dismissible: boolean;
}

const defaultSettings: BannerSettings = {
  enabled: true,
  text: "إصدار تجريبي — نعمل على تطويره من أجلكم ونرحب بملاحظاتكم",
  color: "amber",
  position: "top",
  dismissible: true,
};

const colorClasses: Record<string, string> = {
  amber: "bg-amber-500 hover:bg-amber-600",
  blue: "bg-blue-500 hover:bg-blue-600",
  green: "bg-green-600 hover:bg-green-700",
  red: "bg-red-500 hover:bg-red-600",
  purple: "bg-purple-500 hover:bg-purple-600",
};

const BetaBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const { getJsonSetting, isLoading } = useAppSettings();

  const settings = getJsonSetting<BannerSettings>("beta_banner_settings", defaultSettings);

  if (isLoading || dismissed || !settings.enabled) return null;

  const bg = colorClasses[settings.color] || colorClasses.amber;
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
