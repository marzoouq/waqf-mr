const THEME_KEY = 'waqf_theme_color';

interface ThemeVars {
  primary: string;
  'primary-foreground': string;
  secondary: string;
  accent: string;
  'accent-foreground': string;
  ring: string;
  muted: string;
  'muted-foreground': string;
  border: string;
  input: string;
  card: string;
  'sidebar-background': string;
  'sidebar-accent': string;
  'sidebar-border': string;
  'sidebar-ring': string;
  'sidebar-primary': string;
  'chart-1': string;
  'chart-2': string;
  'chart-3': string;
  'chart-4': string;
  'chart-5': string;
  success: string;
}

export interface ThemeTemplate {
  id: string;
  name: string;
  light: ThemeVars;
  dark: ThemeVars;
  preview: string;
}

export const themes: ThemeTemplate[] = [
  {
    id: 'islamic-green',
    name: 'الأخضر الإسلامي',
    preview: 'hsl(158 64% 25%)',
    light: {
      primary: '158 64% 25%',
      'primary-foreground': '40 30% 98%',
      secondary: '43 74% 49%',
      accent: '158 45% 92%',
      'accent-foreground': '158 64% 25%',
      ring: '158 64% 25%',
      muted: '40 20% 94%',
      'muted-foreground': '150 15% 45%',
      border: '40 20% 88%',
      input: '40 20% 88%',
      card: '0 0% 100%',
      'sidebar-background': '158 64% 22%',
      'sidebar-accent': '158 50% 30%',
      'sidebar-border': '158 50% 30%',
      'sidebar-ring': '43 74% 49%',
      'sidebar-primary': '43 74% 49%',
      'chart-1': '158 64% 25%',
      'chart-2': '43 74% 49%',
      'chart-3': '200 80% 50%',
      'chart-4': '158 45% 45%',
      'chart-5': '43 60% 60%',
      success: '158 64% 40%',
    },
    dark: {
      primary: '158 55% 45%',
      'primary-foreground': '150 30% 8%',
      secondary: '43 74% 55%',
      accent: '158 40% 20%',
      'accent-foreground': '40 30% 98%',
      ring: '158 55% 45%',
      muted: '150 20% 18%',
      'muted-foreground': '40 15% 65%',
      border: '150 20% 20%',
      input: '150 20% 20%',
      card: '150 25% 12%',
      'sidebar-background': '150 30% 6%',
      'sidebar-accent': '150 25% 15%',
      'sidebar-border': '150 20% 15%',
      'sidebar-ring': '43 74% 55%',
      'sidebar-primary': '43 74% 55%',
      'chart-1': '158 55% 45%',
      'chart-2': '43 74% 55%',
      'chart-3': '200 70% 55%',
      'chart-4': '158 40% 55%',
      'chart-5': '43 60% 65%',
      success: '158 50% 50%',
    },
  },
  {
    id: 'royal-blue',
    name: 'الأزرق الملكي',
    preview: 'hsl(220 70% 35%)',
    light: {
      primary: '220 70% 35%',
      'primary-foreground': '0 0% 100%',
      secondary: '43 74% 49%',
      accent: '220 50% 94%',
      'accent-foreground': '220 70% 35%',
      ring: '220 70% 35%',
      muted: '220 15% 94%',
      'muted-foreground': '220 15% 45%',
      border: '220 15% 88%',
      input: '220 15% 88%',
      card: '0 0% 100%',
      'sidebar-background': '220 70% 28%',
      'sidebar-accent': '220 55% 40%',
      'sidebar-border': '220 55% 38%',
      'sidebar-ring': '43 74% 49%',
      'sidebar-primary': '43 74% 49%',
      'chart-1': '220 70% 35%',
      'chart-2': '43 74% 49%',
      'chart-3': '190 70% 50%',
      'chart-4': '250 55% 50%',
      'chart-5': '170 50% 45%',
      success: '150 60% 38%',
    },
    dark: {
      primary: '220 60% 55%',
      'primary-foreground': '220 80% 8%',
      secondary: '43 74% 55%',
      accent: '220 40% 20%',
      'accent-foreground': '0 0% 98%',
      ring: '220 60% 55%',
      muted: '220 20% 18%',
      'muted-foreground': '220 12% 65%',
      border: '220 20% 22%',
      input: '220 20% 22%',
      card: '220 25% 12%',
      'sidebar-background': '220 40% 8%',
      'sidebar-accent': '220 30% 18%',
      'sidebar-border': '220 25% 16%',
      'sidebar-ring': '43 74% 55%',
      'sidebar-primary': '43 74% 55%',
      'chart-1': '220 60% 55%',
      'chart-2': '43 74% 55%',
      'chart-3': '190 60% 55%',
      'chart-4': '250 45% 60%',
      'chart-5': '170 45% 55%',
      success: '150 50% 50%',
    },
  },
  {
    id: 'purple',
    name: 'البنفسجي',
    preview: 'hsl(270 55% 40%)',
    light: {
      primary: '270 55% 40%',
      'primary-foreground': '0 0% 100%',
      secondary: '43 74% 49%',
      accent: '270 40% 94%',
      'accent-foreground': '270 55% 40%',
      ring: '270 55% 40%',
      muted: '270 12% 94%',
      'muted-foreground': '270 12% 45%',
      border: '270 12% 88%',
      input: '270 12% 88%',
      card: '0 0% 100%',
      'sidebar-background': '270 55% 30%',
      'sidebar-accent': '270 45% 42%',
      'sidebar-border': '270 40% 38%',
      'sidebar-ring': '43 74% 49%',
      'sidebar-primary': '43 74% 49%',
      'chart-1': '270 55% 40%',
      'chart-2': '43 74% 49%',
      'chart-3': '320 50% 50%',
      'chart-4': '220 55% 50%',
      'chart-5': '200 50% 50%',
      success: '150 55% 38%',
    },
    dark: {
      primary: '270 50% 55%',
      'primary-foreground': '270 60% 8%',
      secondary: '43 74% 55%',
      accent: '270 35% 20%',
      'accent-foreground': '0 0% 98%',
      ring: '270 50% 55%',
      muted: '270 18% 18%',
      'muted-foreground': '270 10% 65%',
      border: '270 18% 22%',
      input: '270 18% 22%',
      card: '270 22% 12%',
      'sidebar-background': '270 35% 8%',
      'sidebar-accent': '270 30% 18%',
      'sidebar-border': '270 25% 16%',
      'sidebar-ring': '43 74% 55%',
      'sidebar-primary': '43 74% 55%',
      'chart-1': '270 50% 55%',
      'chart-2': '43 74% 55%',
      'chart-3': '320 40% 55%',
      'chart-4': '220 45% 55%',
      'chart-5': '200 45% 55%',
      success: '150 45% 50%',
    },
  },
  {
    id: 'navy',
    name: 'الكحلي',
    preview: 'hsl(210 60% 25%)',
    light: {
      primary: '210 60% 25%',
      'primary-foreground': '0 0% 100%',
      secondary: '43 74% 49%',
      accent: '210 40% 94%',
      'accent-foreground': '210 60% 25%',
      ring: '210 60% 25%',
      muted: '210 12% 94%',
      'muted-foreground': '210 12% 45%',
      border: '210 12% 88%',
      input: '210 12% 88%',
      card: '0 0% 100%',
      'sidebar-background': '210 60% 20%',
      'sidebar-accent': '210 50% 32%',
      'sidebar-border': '210 45% 28%',
      'sidebar-ring': '43 74% 49%',
      'sidebar-primary': '43 74% 49%',
      'chart-1': '210 60% 25%',
      'chart-2': '43 74% 49%',
      'chart-3': '180 55% 45%',
      'chart-4': '240 50% 50%',
      'chart-5': '160 45% 45%',
      success: '150 55% 38%',
    },
    dark: {
      primary: '210 55% 50%',
      'primary-foreground': '210 60% 8%',
      secondary: '43 74% 55%',
      accent: '210 40% 20%',
      'accent-foreground': '0 0% 98%',
      ring: '210 55% 50%',
      muted: '210 18% 18%',
      'muted-foreground': '210 10% 65%',
      border: '210 18% 22%',
      input: '210 18% 22%',
      card: '210 22% 12%',
      'sidebar-background': '210 40% 6%',
      'sidebar-accent': '210 30% 15%',
      'sidebar-border': '210 25% 14%',
      'sidebar-ring': '43 74% 55%',
      'sidebar-primary': '43 74% 55%',
      'chart-1': '210 55% 50%',
      'chart-2': '43 74% 55%',
      'chart-3': '180 45% 55%',
      'chart-4': '240 40% 55%',
      'chart-5': '160 40% 55%',
      success: '150 45% 50%',
    },
  },
  {
    id: 'maroon',
    name: 'الخمري',
    preview: 'hsl(350 55% 35%)',
    light: {
      primary: '350 55% 35%',
      'primary-foreground': '0 0% 100%',
      secondary: '43 74% 49%',
      accent: '350 35% 94%',
      'accent-foreground': '350 55% 35%',
      ring: '350 55% 35%',
      muted: '350 10% 94%',
      'muted-foreground': '350 10% 45%',
      border: '350 10% 88%',
      input: '350 10% 88%',
      card: '0 0% 100%',
      'sidebar-background': '350 55% 28%',
      'sidebar-accent': '350 45% 38%',
      'sidebar-border': '350 40% 34%',
      'sidebar-ring': '43 74% 49%',
      'sidebar-primary': '43 74% 49%',
      'chart-1': '350 55% 35%',
      'chart-2': '43 74% 49%',
      'chart-3': '20 60% 50%',
      'chart-4': '280 45% 50%',
      'chart-5': '200 50% 50%',
      success: '150 55% 38%',
    },
    dark: {
      primary: '350 50% 50%',
      'primary-foreground': '350 60% 8%',
      secondary: '43 74% 55%',
      accent: '350 35% 20%',
      'accent-foreground': '0 0% 98%',
      ring: '350 50% 50%',
      muted: '350 15% 18%',
      'muted-foreground': '350 8% 65%',
      border: '350 15% 22%',
      input: '350 15% 22%',
      card: '350 20% 12%',
      'sidebar-background': '350 35% 8%',
      'sidebar-accent': '350 30% 18%',
      'sidebar-border': '350 25% 16%',
      'sidebar-ring': '43 74% 55%',
      'sidebar-primary': '43 74% 55%',
      'chart-1': '350 50% 50%',
      'chart-2': '43 74% 55%',
      'chart-3': '20 50% 55%',
      'chart-4': '280 35% 55%',
      'chart-5': '200 45% 55%',
      success: '150 45% 50%',
    },
  },
];

const applyVars = (vars: ThemeVars) => {
  const root = document.documentElement;
  (Object.keys(vars) as Array<keyof ThemeVars>).forEach((key) => {
    root.style.setProperty(`--${key}`, vars[key]);
  });
};

const isDark = () => document.documentElement.classList.contains('dark');

export const applyTheme = (theme: ThemeTemplate) => {
  applyVars(isDark() ? theme.dark : theme.light);
};

export const resetTheme = () => {
  const allKeys = Object.keys(themes[0].light) as Array<keyof ThemeVars>;
  allKeys.forEach((key) => document.documentElement.style.removeProperty(`--${key}`));
};

let themeObserver: MutationObserver | null = null;

export const initThemeFromStorage = () => {
  try {
    const savedId = localStorage.getItem(THEME_KEY);
    if (savedId && savedId !== 'islamic-green') {
      const theme = themes.find((item) => item.id === savedId);
      if (theme) applyTheme(theme);
    }
  } catch {
    return;
  }

  themeObserver?.disconnect();
  themeObserver = new MutationObserver(() => {
    try {
      const savedId = localStorage.getItem(THEME_KEY);
      if (savedId && savedId !== 'islamic-green') {
        const theme = themes.find((item) => item.id === savedId);
        if (theme) applyTheme(theme);
      }
    } catch {
      // ignore storage failures
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
};

export const cleanupThemeObserver = () => {
  themeObserver?.disconnect();
  themeObserver = null;
};

export { THEME_KEY };