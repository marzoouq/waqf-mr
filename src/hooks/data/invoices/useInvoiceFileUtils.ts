/**
 * أدوات ملفات الفواتير — التحقق من التوقيع والرفع والتنزيل
 */
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// ثوابت مشتركة
// ---------------------------------------------------------------------------

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const VALID_EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

// ---------------------------------------------------------------------------
// CRIT-3: Magic bytes validation — فحص التوقيع الحقيقي للملف
// ---------------------------------------------------------------------------

const FILE_SIGNATURES: { mime: string; offset: number; bytes: number[] }[] = [
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/jpeg', offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
];

const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50]; // "WEBP" at offset 8

async function validateFileSignature(file: File): Promise<boolean> {
  const headerBytes = await file.slice(0, 12).arrayBuffer();
  const view = new Uint8Array(headerBytes);

  for (const sig of FILE_SIGNATURES) {
    if (sig.mime !== file.type) continue;

    const matches = sig.bytes.every((b, i) => view[sig.offset + i] === b);
    if (!matches) return false;

    // فحص إضافي لـ WebP — يجب أن يحتوي على "WEBP" عند offset 8
    if (sig.mime === 'image/webp') {
      return WEBP_MARKER.every((b, i) => view[8 + i] === b);
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Storage utilities
// ---------------------------------------------------------------------------

export const uploadInvoiceFile = async (file: File): Promise<{ path: string; name: string }> => {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('نوع الملف غير مسموح. الأنواع المسموحة: PDF, JPG, PNG, WEBP');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الملف يتجاوز الحد الأقصى (10 ميجابايت)');
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !VALID_EXTENSIONS[file.type]?.includes(ext)) {
    throw new Error('امتداد الملف لا يتطابق مع نوعه');
  }

  // CRIT-3: فحص magic bytes — التوقيع الفعلي للملف
  const isValidSignature = await validateFileSignature(file);
  if (!isValidSignature) {
    throw new Error('محتوى الملف لا يتطابق مع نوعه المعلن — ملف مزوَّر محتمل');
  }

  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('invoices').upload(path, file, {
    contentType: file.type,
  });
  if (error) throw error;

  return { path, name: file.name };
};

// CRIT-5: استبدال download() بـ createSignedUrl مع TTL + path validation
export const getInvoiceSignedUrl = async (filePath: string): Promise<string> => {
  // فحص path traversal
  if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
    throw new Error('مسار الملف غير صالح');
  }

  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(filePath, 300); // TTL = 5 دقائق

  if (error || !data?.signedUrl) throw new Error('فشل في إنشاء رابط التحميل');

  return data.signedUrl;
};
