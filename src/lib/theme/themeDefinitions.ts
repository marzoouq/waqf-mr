/** تعريفات أنواع الثيمات — بيانات الثيمات في مجلد themes/ */

export interface ThemeVars {
  // ── الأساسية ──
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  muted: string;
  'muted-foreground': string;
  border: string;
  input: string;
  ring: string;
  // ── الشريط الجانبي ──
  'sidebar-background': string;
  'sidebar-foreground': string;
  'sidebar-primary': string;
  'sidebar-primary-foreground': string;
  'sidebar-accent': string;
  'sidebar-accent-foreground': string;
  'sidebar-border': string;
  'sidebar-ring': string;
  // ── ألوان وظيفية ──
  success: string;
  'success-foreground': string;
  'success-muted': string;
  warning: string;
  'warning-foreground': string;
  // ── المخططات ──
  'chart-1': string;
  'chart-2': string;
  'chart-3': string;
  'chart-4': string;
  'chart-5': string;
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
