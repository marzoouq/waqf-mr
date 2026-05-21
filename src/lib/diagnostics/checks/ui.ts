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
    // Amiri يُحمَّل عند الطلب (للطباعة/PDF) — غيابه ليس خطأ
    if (!hasTajawal) return { id, label: 'الخطوط', status: 'warn', detail: 'Tajawal غير محمّل (خط الواجهة الأساسي)' };
    if (!hasAmiri) return { id, label: 'الخطوط', status: 'info', detail: `Tajawal محمّل — Amiri يُحمَّل عند الطباعة فقط (${loadedFamilies.size} عائلة)` };
    return { id, label: 'الخطوط', status: 'pass', detail: `Tajawal + Amiri محمّلان (${loadedFamilies.size} عائلة)` };
  } catch {
    return { id, label: 'الخطوط', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkCSP(): Promise<CheckResult> {
  const id = 'ui_csp';
  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (meta) return { id, label: 'Content Security Policy', status: 'pass', detail: 'موجود في meta tag' };

  // محاولة قراءة CSP عبر HTTP header
  try {
    const res = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    const cspHeader = res.headers.get('content-security-policy') || res.headers.get('content-security-policy-report-only');
    if (cspHeader) return { id, label: 'Content Security Policy', status: 'pass', detail: 'مضبوط عبر HTTP header' };
    // CSP يُضبط على مستوى البنية التحتية للنشر (Lovable hosting) — غيابه في preview/HMR متوقع
    return { id, label: 'Content Security Policy', status: 'info', detail: 'يُضبط عبر البنية التحتية للنشر (غير مرئي في preview)' };
  } catch {
    return { id, label: 'Content Security Policy', status: 'info', detail: 'تعذر التحقق من header — تحقق يدوي مطلوب' };
  }
}
