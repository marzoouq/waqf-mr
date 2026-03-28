/**
 * بطاقة 4 — فحوصات الواجهة والتصميم (3)
 */
import type { CheckResult } from '../types';

export async function checkCssVariables(): Promise<CheckResult> {
  const id = 'ui_css';
  const required = ['--background', '--foreground', '--primary', '--secondary', '--muted', '--accent'];
  const root = getComputedStyle(document.documentElement);
  const missing = required.filter(v => !root.getPropertyValue(v).trim());
  if (missing.length > 0) return { id, label: 'متغيرات CSS', status: 'fail', detail: `مفقودة: ${missing.join('، ')}` };
  return { id, label: 'متغيرات CSS', status: 'pass', detail: `${required.length} متغير أساسي موجود` };
}

export async function checkFontsLoaded(): Promise<CheckResult> {
  const id = 'ui_fonts';
  try {
    const fonts = await document.fonts.ready;
    const loadedFamilies = new Set<string>();
    fonts.forEach(f => loadedFamilies.add(f.family));
    const hasTajawal = loadedFamilies.has('Tajawal');
    const hasAmiri = loadedFamilies.has('Amiri');
    if (!hasTajawal && !hasAmiri) return { id, label: 'الخطوط', status: 'warn', detail: 'Tajawal و Amiri غير محمّلين' };
    if (!hasTajawal || !hasAmiri) return { id, label: 'الخطوط', status: 'warn', detail: `مفقود: ${!hasTajawal ? 'Tajawal' : 'Amiri'}` };
    return { id, label: 'الخطوط', status: 'pass', detail: `Tajawal + Amiri محمّلان (${loadedFamilies.size} عائلة)` };
  } catch {
    return { id, label: 'الخطوط', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkCSP(): Promise<CheckResult> {
  const id = 'ui_csp';
  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  return { id, label: 'Content Security Policy', status: meta ? 'pass' : 'info', detail: meta ? 'موجود في meta tag' : 'غير مضبوط عبر meta — قد يكون عبر header' };
}
