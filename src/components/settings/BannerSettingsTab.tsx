import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useState, useEffect, useMemo } from "react";
import { FlaskConical } from "lucide-react";
import { BANNER_COLORS, DEFAULT_BANNER_SETTINGS, type BannerSettings } from "@/constants";

const BannerSettingsTab = () => {
  const { getJsonSetting, updateJsonSetting, isLoading } = useAppSettings();
  const rawSettings = getJsonSetting<BannerSettings>("beta_banner_settings", DEFAULT_BANNER_SETTINGS);
  // FIX #8: Stabilize settings reference to avoid fragile deps
  const settings = useMemo(() => rawSettings, [JSON.stringify(rawSettings)]);
  const [form, setForm] = useState<BannerSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const save = (patch: Partial<BannerSettings>) => {
    const updated = { ...form, ...patch };
    setForm(updated);
    updateJsonSetting("beta_banner_settings", updated);
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            شريط التنبيه
          </CardTitle>
          <CardDescription>التحكم بشريط التنبيه الظاهر لجميع المستخدمين</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Toggle */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium">إظهار الشريط</p>
              <p className="text-xs text-muted-foreground">تفعيل أو تعطيل شريط التنبيه</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => save({ enabled: v })} />
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <Label>نص الشريط</Label>
            <Input
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              onBlur={() => save({ text: form.text })}
              maxLength={200}
              dir="rtl"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>اللون</Label>
            <div className="flex flex-wrap gap-3">
              {BANNER_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => save({ color: c.value })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 transition-all text-sm ${
                    form.color === c.value
                      ? "border-foreground shadow-md scale-105"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full ${c.className}`} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>الموقع</Label>
            <div className="flex gap-3">
              <button
                onClick={() => save({ position: "top" })}
                className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                  form.position === "top" ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/50"
                }`}
              >
                أعلى المحتوى
              </button>
              <button
                onClick={() => save({ position: "bottom" })}
                className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                  form.position === "bottom" ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/50"
                }`}
              >
                أسفل الصفحة
              </button>
            </div>
          </div>

          {/* Dismissible */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium">زر الإغلاق المؤقت</p>
              <p className="text-xs text-muted-foreground">السماح للمستخدم بإخفاء الشريط مؤقتاً</p>
            </div>
            <Switch checked={form.dismissible} onCheckedChange={(v) => save({ dismissible: v })} />
          </div>

          {/* Preview */}
          {form.enabled && (
            <div className="space-y-2">
              <Label>معاينة</Label>
              <div
                className={`flex items-center justify-center gap-2 ${
                  BANNER_COLORS.find((c) => c.value === form.color)?.className || "bg-warning"
                } px-4 py-1.5 text-white text-sm font-medium rounded-lg shadow-md`}
              >
                <FlaskConical className="h-4 w-4 shrink-0" />
                <span>{form.text || "نص الشريط"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BannerSettingsTab;
