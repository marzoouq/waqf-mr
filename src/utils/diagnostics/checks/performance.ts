/**
 * بطاقة 2 — فحوصات المتصفح والأداء
 * تم تنظيفها: حذف checkNavigatorLocks و checkWebAssembly (بلا قيمة تشخيصية)
 */
import { getPagePerfSummaries } from '@/lib/monitoring';
import type { CheckResult, CheckStatus } from '../types';

export async function checkScrollPerformance(): Promise<CheckResult> {
  const id = 'perf_scroll';
  try {
    const passiveSupported = (() => {
      let supported = false;
      try {
        const opts = Object.defineProperty({}, 'passive', { get() { supported = true; return true; } });
        window.addEventListener('testPassive', null as unknown as EventListener, opts);
        window.removeEventListener('testPassive', null as unknown as EventListener, opts);
      } catch { /* تجاهل */ }
      return supported;
    })();
    return { id, label: 'أداء التمرير (Passive Events)', status: passiveSupported ? 'pass' : 'warn', detail: passiveSupported ? 'مدعوم' : 'غير مدعوم — قد يؤثر على الأداء' };
  } catch {
    return { id, label: 'أداء التمرير', status: 'info', detail: 'تعذر الفحص' };
  }
}

export async function checkDomNodesCount(): Promise<CheckResult> {
  const id = 'perf_dom';
  const count = document.querySelectorAll('*').length;
  // ✅ إصلاح: الشروط مرتبة من الأشد للأخف
  const status: CheckStatus = count > 5000 ? 'fail' : count > 3000 ? 'warn' : 'pass';
  return { id, label: 'عدد عناصر DOM', status, detail: `${count} عنصر` };
}

export async function checkDeviceMemory(): Promise<CheckResult> {
  const id = 'perf_memory';
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (!mem) return { id, label: 'ذاكرة الجهاز', status: 'info', detail: 'غير متاح في هذا المتصفح' };
  return { id, label: 'ذاكرة الجهاز', status: mem < 4 ? 'warn' : 'pass', detail: `${mem} GB` };
}

export async function checkPagePerformance(): Promise<CheckResult> {
  const id = 'perf_pages';
  const summaries = getPagePerfSummaries();
  if (summaries.length === 0) return { id, label: 'أداء الصفحات', status: 'info', detail: 'سيتوفر بعد التنقل بين الصفحات' };
  const slowPages = summaries.filter(s => s.avgMs > 2000);
  if (slowPages.length > 0) {
    return { id, label: 'أداء الصفحات', status: 'warn', detail: `${slowPages.length} صفحة بطيئة (>2s): ${slowPages.map(s => s.label).join('، ')}` };
  }
  return { id, label: 'أداء الصفحات', status: 'pass', detail: `${summaries.length} صفحة مُسجّلة — الأبطأ: ${summaries[0]?.label} (${summaries[0]?.avgMs}ms)` };
}

// ─── حساب نسبة التباين WCAG ───
// HSL → RGB → relative luminance → contrast ratio
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function parseHsl(value: string): [number, number, number] | null {
  // يقبل صيغة tailwind: "220 20% 10%" أو "220, 20%, 10%"
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)%?\s*[, ]\s*(\d+(?:\.\d+)?)%?$/);
  if (!match) return null;
  return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export async function checkWcagContrast(): Promise<CheckResult> {
  const id = 'perf_contrast';
  try {
    const root = document.documentElement;
    const bgRaw = getComputedStyle(root).getPropertyValue('--background').trim();
    const fgRaw = getComputedStyle(root).getPropertyValue('--foreground').trim();
    if (!bgRaw || !fgRaw) return { id, label: 'تباين الألوان (WCAG)', status: 'warn', detail: 'تعذر قراءة متغيرات CSS' };

    const bgHsl = parseHsl(bgRaw);
    const fgHsl = parseHsl(fgRaw);
    if (!bgHsl || !fgHsl) {
      return { id, label: 'تباين الألوان (WCAG)', status: 'info', detail: `صيغة غير مدعومة — bg: ${bgRaw} | fg: ${fgRaw}` };
    }

    const bgLum = relativeLuminance(hslToRgb(...bgHsl));
    const fgLum = relativeLuminance(hslToRgb(...fgHsl));
    const lighter = Math.max(bgLum, fgLum);
    const darker = Math.min(bgLum, fgLum);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    const ratioStr = ratio.toFixed(2);

    if (ratio >= 4.5) return { id, label: 'تباين الألوان (WCAG)', status: 'pass', detail: `النسبة: ${ratioStr}:1 (AA ✓)` };
    if (ratio >= 3) return { id, label: 'تباين الألوان (WCAG)', status: 'warn', detail: `النسبة: ${ratioStr}:1 — أقل من AA (4.5)` };
    return { id, label: 'تباين الألوان (WCAG)', status: 'fail', detail: `النسبة: ${ratioStr}:1 — تباين ضعيف جداً` };
  } catch {
    return { id, label: 'تباين الألوان (WCAG)', status: 'info', detail: 'تعذر الفحص' };
  }
}
