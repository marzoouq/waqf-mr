/** دوال تطبيق وإدارة الثيمات */
import type { ThemeVars, ThemeTemplate } from './themeDefinitions';
import { themes } from './themeDefinitions';

// إعادة تصدير للتوافق مع الاستيرادات الحالية
export type { ThemeVars, ThemeTemplate };
export { themes };

const THEME_KEY = 'waqf_theme_color';

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
  const allKeys = Object.keys(themes[0]!.light) as Array<keyof ThemeVars>;
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
