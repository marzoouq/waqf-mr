/** تعريفات أنواع الثيمات — بيانات الثيمات في مجلد themes/ */

export interface ThemeVars {
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

// إعادة تصدير الثيمات من المجلد الفرعي للتوافق العكسي
export { themes } from './themes';
