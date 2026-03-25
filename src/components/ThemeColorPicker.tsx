import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { THEME_KEY, applyTheme, resetTheme, themes, type ThemeTemplate } from '@/components/themeColor.utils';

const ThemeColorPicker = () => {
  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'islamic-green'; } catch { return 'islamic-green'; }
  });

  const handleSelect = (theme: ThemeTemplate) => {
    setActiveId(theme.id);
    try { localStorage.setItem(THEME_KEY, theme.id); } catch { /* ignored */ }
    if (theme.id === 'islamic-green') {
      resetTheme();
    } else {
      applyTheme(theme);
    }
    toast.success(`تم تطبيق قالب "${theme.name}"`);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Palette className="w-5 h-5" />
          قالب الألوان
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">اختر قالب ألوان التطبيق المفضل لديك</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md',
                activeId === theme.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent bg-muted/30 hover:border-muted-foreground/20'
              )}
            >
              <div
                className="w-12 h-12 rounded-full border-2 border-background shadow-md relative"
                style={{ backgroundColor: theme.preview }}
              >
                {activeId === theme.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              <span className="text-xs font-medium">{theme.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          يتم حفظ اختيارك على هذا الجهاز فقط. يتكيف القالب تلقائياً مع الوضع الداكن.
        </p>
      </CardContent>
    </Card>
  );
};

export default ThemeColorPicker;
