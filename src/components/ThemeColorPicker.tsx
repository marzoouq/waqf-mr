import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';
import { toast } from 'sonner';

const THEME_KEY = 'waqf_theme_color';

interface ThemeTemplate {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  sidebarBg: string;
  sidebarAccent: string;
  // dark mode overrides
  darkPrimary: string;
  darkSecondary: string;
  darkAccent: string;
  darkSidebarBg: string;
  darkSidebarAccent: string;
  preview: string; // CSS color for the circle preview
}

const themes: ThemeTemplate[] = [
  {
    id: 'islamic-green',
    name: 'الأخضر الإسلامي',
    primary: '158 64% 25%',
    secondary: '43 74% 49%',
    accent: '158 45% 92%',
    sidebarBg: '158 64% 22%',
    sidebarAccent: '158 50% 30%',
    darkPrimary: '158 55% 45%',
    darkSecondary: '43 74% 55%',
    darkAccent: '158 40% 20%',
    darkSidebarBg: '150 30% 6%',
    darkSidebarAccent: '150 25% 15%',
    preview: 'hsl(158 64% 25%)',
  },
  {
    id: 'royal-blue',
    name: 'الأزرق الملكي',
    primary: '220 70% 35%',
    secondary: '43 74% 49%',
    accent: '220 50% 92%',
    sidebarBg: '220 70% 28%',
    sidebarAccent: '220 55% 40%',
    darkPrimary: '220 60% 55%',
    darkSecondary: '43 74% 55%',
    darkAccent: '220 40% 20%',
    darkSidebarBg: '220 40% 8%',
    darkSidebarAccent: '220 30% 18%',
    preview: 'hsl(220 70% 35%)',
  },
  {
    id: 'purple',
    name: 'البنفسجي',
    primary: '270 55% 40%',
    secondary: '43 74% 49%',
    accent: '270 40% 92%',
    sidebarBg: '270 55% 30%',
    sidebarAccent: '270 45% 42%',
    darkPrimary: '270 50% 55%',
    darkSecondary: '43 74% 55%',
    darkAccent: '270 35% 20%',
    darkSidebarBg: '270 35% 8%',
    darkSidebarAccent: '270 30% 18%',
    preview: 'hsl(270 55% 40%)',
  },
  {
    id: 'navy',
    name: 'الكحلي',
    primary: '210 60% 25%',
    secondary: '43 74% 49%',
    accent: '210 45% 92%',
    sidebarBg: '210 60% 20%',
    sidebarAccent: '210 50% 32%',
    darkPrimary: '210 55% 50%',
    darkSecondary: '43 74% 55%',
    darkAccent: '210 40% 20%',
    darkSidebarBg: '210 40% 6%',
    darkSidebarAccent: '210 30% 15%',
    preview: 'hsl(210 60% 25%)',
  },
  {
    id: 'maroon',
    name: 'الخمري',
    primary: '350 55% 35%',
    secondary: '43 74% 49%',
    accent: '350 40% 92%',
    sidebarBg: '350 55% 28%',
    sidebarAccent: '350 45% 38%',
    darkPrimary: '350 50% 50%',
    darkSecondary: '43 74% 55%',
    darkAccent: '350 35% 20%',
    darkSidebarBg: '350 35% 8%',
    darkSidebarAccent: '350 30% 18%',
    preview: 'hsl(350 55% 35%)',
  },
];

const applyTheme = (theme: ThemeTemplate) => {
  const root = document.documentElement;
  // Light mode
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--ring', theme.primary);
  root.style.setProperty('--accent-foreground', theme.primary);
  root.style.setProperty('--sidebar-background', theme.sidebarBg);
  root.style.setProperty('--sidebar-accent', theme.sidebarAccent);
  root.style.setProperty('--sidebar-border', theme.sidebarAccent);
  root.style.setProperty('--sidebar-ring', theme.secondary);
  root.style.setProperty('--success', theme.primary.replace(/25%$/, '40%'));
};

const resetTheme = () => {
  const props = [
    '--primary', '--secondary', '--accent', '--ring', '--accent-foreground',
    '--sidebar-background', '--sidebar-accent', '--sidebar-border', '--sidebar-ring', '--success',
  ];
  props.forEach(p => document.documentElement.style.removeProperty(p));
};

export const initThemeFromStorage = () => {
  try {
    const savedId = localStorage.getItem(THEME_KEY);
    if (savedId && savedId !== 'islamic-green') {
      const theme = themes.find(t => t.id === savedId);
      if (theme) applyTheme(theme);
    }
  } catch {}
};

const ThemeColorPicker = () => {
  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'islamic-green'; } catch { return 'islamic-green'; }
  });

  const handleSelect = (theme: ThemeTemplate) => {
    setActiveId(theme.id);
    localStorage.setItem(THEME_KEY, theme.id);
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
          يتم حفظ اختيارك على هذا الجهاز فقط.
        </p>
      </CardContent>
    </Card>
  );
};

export default ThemeColorPicker;
