/**
 * بطاقة 2 — فحوصات المتصفح والأداء (7)
 */
import { getPagePerfSummaries } from '@/lib/monitoring';
import type { CheckResult, CheckStatus } from '../types';

export async function checkNavigatorLocks(): Promise<CheckResult> {
  const id = 'perf_locks';
  const supported = 'locks' in navigator;
  return { id, label: 'Navigator Locks API', status: supported ? 'pass' : 'info', detail: supported ? 'مدعوم' : 'غير مدعوم' };
}

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
  const status: CheckStatus = count > 3000 ? 'warn' : count > 5000 ? 'fail' : 'pass';
  return { id, label: 'عدد عناصر DOM', status, detail: `${count} عنصر` };
}

export async function checkDeviceMemory(): Promise<CheckResult> {
  const id = 'perf_memory';
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (!mem) return { id, label: 'ذاكرة الجهاز', status: 'info', detail: 'غير متاح في هذا المتصفح' };
  return { id, label: 'ذاكرة الجهاز', status: mem < 4 ? 'warn' : 'pass', detail: `${mem} GB` };
}

export async function checkWebAssembly(): Promise<CheckResult> {
  const id = 'perf_wasm';
  const supported = typeof WebAssembly !== 'undefined';
  return { id, label: 'WebAssembly', status: supported ? 'pass' : 'info', detail: supported ? 'مدعوم' : 'غير مدعوم' };
}

export async function checkPagePerformance(): Promise<CheckResult> {
  const id = 'perf_pages';
  const summaries = getPagePerfSummaries();
  if (summaries.length === 0) return { id, label: 'أداء الصفحات', status: 'info', detail: 'لا توجد بيانات بعد' };
  const slowPages = summaries.filter(s => s.avgMs > 2000);
  if (slowPages.length > 0) {
    return { id, label: 'أداء الصفحات', status: 'warn', detail: `${slowPages.length} صفحة بطيئة (>${'2s'}): ${slowPages.map(s => s.label).join('، ')}` };
  }
  return { id, label: 'أداء الصفحات', status: 'pass', detail: `${summaries.length} صفحة مُسجّلة — الأبطأ: ${summaries[0]?.label} (${summaries[0]?.avgMs}ms)` };
}

export async function checkWcagContrast(): Promise<CheckResult> {
  const id = 'perf_contrast';
  try {
    const root = document.documentElement;
    const bg = getComputedStyle(root).getPropertyValue('--background').trim();
    const fg = getComputedStyle(root).getPropertyValue('--foreground').trim();
    if (!bg || !fg) return { id, label: 'تباين الألوان (WCAG)', status: 'warn', detail: 'تعذر قراءة متغيرات CSS' };
    return { id, label: 'تباين الألوان (WCAG)', status: 'info', detail: `خلفية: ${bg} | نص: ${fg}` };
  } catch {
    return { id, label: 'تباين الألوان (WCAG)', status: 'info', detail: 'تعذر الفحص' };
  }
}
