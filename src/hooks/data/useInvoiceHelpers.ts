/**
 * أدوات مساعدة للفواتير — التحقق من الملفات، الرفع، التوقيع، وتوليد PDF
 * مفصولة عن CRUD الأساسي في useInvoices.ts
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from './mutationNotify';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// ثوابت التحقق من الملفات
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
// Magic bytes validation — فحص التوقيع الحقيقي للملف
// ---------------------------------------------------------------------------

const FILE_SIGNATURES: { mime: string; offset: number; bytes: number[] }[] = [
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/jpeg', offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
];

const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50];

async function validateFileSignature(file: File): Promise<boolean> {
  const headerBytes = await file.slice(0, 12).arrayBuffer();
  const view = new Uint8Array(headerBytes);

  for (const sig of FILE_SIGNATURES) {
    if (sig.mime !== file.type) continue;
    const matches = sig.bytes.every((b, i) => view[sig.offset + i] === b);
    if (!matches) return false;
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

export const getInvoiceSignedUrl = async (filePath: string): Promise<string> => {
  if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
    throw new Error('مسار الملف غير صالح');
  }

  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(filePath, 300);

  if (error || !data?.signedUrl) throw new Error('فشل في إنشاء رابط التحميل');
  return data.signedUrl;
};

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

export interface GenerateInvoicePdfOptions {
  invoice_ids: string[];
  template?: 'professional' | 'simplified';
  forceRegenerate?: boolean;
  table?: 'invoices' | 'payment_invoices';
}

export const useGenerateInvoicePdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: string[] | GenerateInvoicePdfOptions) => {
      const opts: GenerateInvoicePdfOptions = Array.isArray(options)
        ? { invoice_ids: options }
        : options;

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('يجب تسجيل الدخول أولاً');

      const body: Record<string, unknown> = { invoice_ids: opts.invoice_ids };
      if (opts.template) body.template = opts.template;
      if (opts.forceRegenerate) body.force_regenerate = true;
      if (opts.table) body.table = opts.table;

      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', { body });
      if (error) throw error;
      return data as { results: { id: string; invoice_number: string | null; success: boolean; error?: string }[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const successCount = data.results.filter((r) => r.success && r.error !== 'already has file').length;
      if (successCount > 0) {
        defaultNotify.success(`تم توليد ${successCount} ملف PDF بنجاح`);
      } else {
        defaultNotify.info('جميع الفواتير تحتوي على مرفقات بالفعل');
      }
    },
    onError: () => {
      defaultNotify.error('حدث خطأ أثناء توليد ملفات PDF');
    },
  });
};
