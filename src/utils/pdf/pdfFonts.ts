/**
 * تحميل الخطوط والشعارات لملفات PDF — مستخرج من core.ts
 */
import type jsPDF from 'jspdf';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// كاش الخطوط على مستوى الوحدة — يمنع إعادة الجلب عند كل توليد PDF
let fontCache: { regular: string; bold: string } | null = null;

export const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
};

// استراتيجية كاش متدرجة: كاش أولاً → تجاوز الكاش → جلب جديد تماماً
const CACHE_STRATEGIES: RequestCache[] = ['force-cache', 'reload', 'no-store'];

export const fetchFontWithRetry = async (url: string, retries = 2): Promise<string> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const cacheMode = CACHE_STRATEGIES[attempt] ?? 'no-store';
      const res = await fetch(url, { cache: cacheMode });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1000) throw new Error(`Font file too small (${buf.byteLength} bytes) — likely corrupt`);
      return toBase64(buf);
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
};

export const loadArabicFont = async (doc: jsPDF) => {
  try {
    if (!fontCache) {
      const [regular, bold] = await Promise.all([
        fetchFontWithRetry('/fonts/Amiri-Regular.ttf'),
        fetchFontWithRetry('/fonts/Amiri-Bold.ttf'),
      ]);
      fontCache = { regular, bold };
    }

    doc.addFileToVFS('Amiri-Regular.ttf', fontCache.regular);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 'Identity-H');
    doc.addFileToVFS('Amiri-Bold.ttf', fontCache.bold);
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold', 'Identity-H');
    doc.setFont('Amiri');
    doc.setLanguage('ar');
    return true;
  } catch (e) {
    fontCache = null;
    logger.error('Failed to load Arabic fonts for PDF:', e);
    toast.error('تعذر تحميل الخطوط العربية — قد يظهر PDF بشكل غير صحيح');
    doc.setFont('helvetica');
    return false;
  }
};

// M-06 fix: validate logoUrl before fetching
export const isValidLogoUrl = (url: string): boolean => {
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) return true;
    if (parsed.hostname.endsWith('.supabase.co')) return true;
    return false;
  } catch {
    return false;
  }
};

export const loadLogoBase64 = async (url: string): Promise<string | null> => {
  try {
    if (!isValidLogoUrl(url)) {
      logger.warn('Blocked external logo URL in PDF generation:', url);
      return null;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};
