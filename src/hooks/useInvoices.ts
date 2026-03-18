import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createCrudFactory } from './useCrudFactory';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_type: string;
  amount: number;
  date: string;
  property_id: string | null;
  contract_id: string | null;
  expense_id: string | null;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  status: string;
  fiscal_year_id: string | null;
  vat_rate: number;
  vat_amount: number;
  amount_excluding_vat: number | null;
  zatca_uuid: string | null;
  zatca_status: string;
  created_at: string;
  updated_at: string;
  property?: { id: string; property_number: string; location: string } | null;
  contract?: { id: string; contract_number: string; tenant_name: string } | null;
}

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  utilities: 'خدمات (كهرباء/مياه)',
  maintenance: 'صيانة ومقاولات',
  rent: 'إيجار',
  other: 'أخرى',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: 'معلّقة',
  paid: 'مدفوعة',
  cancelled: 'ملغاة',
  overdue: 'متأخرة',
};

// HIGH-1: ثوابت مشتركة — تُصدَّر لإعادة الاستخدام في InvoicesPage
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
  // PDF: %PDF
  { mime: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  // PNG: 89 50 4E 47
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] },
  // JPEG: FF D8 FF
  { mime: 'image/jpeg', offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  // WebP: RIFF....WEBP
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
// Factory-based CRUD
// ---------------------------------------------------------------------------

const invoicesCrud = createCrudFactory<'invoices', Invoice>({
  table: 'invoices',
  queryKey: 'invoices',
  select: '*, property:properties(id, property_number, location), contract:contracts(id, contract_number, tenant_name)',
  orderBy: 'date',
  ascending: false,
  label: 'الفاتورة',
});

export const useInvoices = invoicesCrud.useList;
export const useCreateInvoice = invoicesCrud.useCreate;
export const useUpdateInvoice = invoicesCrud.useUpdate;

/** Invoices filtered by fiscal year */
export const useInvoicesByFiscalYear = (fiscalYearId: string | 'all') => {
  return useQuery({
    queryKey: ['invoices', 'fiscal_year', fiscalYearId],
    enabled: fiscalYearId !== '__none__',
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, property:properties(id, property_number, location), contract:contracts(id, contract_number, tenant_name)')
        .order('date', { ascending: false })
        .limit(1000);
      if (fiscalYearId !== 'all') {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
  });
};

// ---------------------------------------------------------------------------
// CRIT-4: حذف DB أولاً ثم Storage — ترتيب صحيح
// ---------------------------------------------------------------------------

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file_path }: { id: string; file_path?: string | null }) => {
      // حذف السجل من قاعدة البيانات أولاً
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;

      // حذف الملف من Storage — فشله لا يُوقف العملية
      if (file_path) {
        try {
          await supabase.storage.from('invoices').remove([file_path]);
        } catch (storageErr) {
          logger.warn('فشل حذف ملف الفاتورة من التخزين — سيبقى كملف يتيم', { file_path, error: storageErr });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم حذف الفاتورة بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الفاتورة');
    },
  });
};

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

// ---------------------------------------------------------------------------
// Generate PDF for invoices without attachments
// HIGH-2: استبدال getSession() بـ getUser()
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
      // دعم التوقيع القديم (مصفوفة معرّفات فقط) والجديد (كائن خيارات)
      const opts: GenerateInvoicePdfOptions = Array.isArray(options)
        ? { invoice_ids: options }
        : options;

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('يجب تسجيل الدخول أولاً');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('جلسة غير صالحة — يرجى تسجيل الدخول مجدداً');

      const body: Record<string, unknown> = { invoice_ids: opts.invoice_ids };
      if (opts.template) body.template = opts.template;
      if (opts.forceRegenerate) body.force_regenerate = true;
      if (opts.table) body.table = opts.table;

      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data as { results: { id: string; invoice_number: string | null; success: boolean; error?: string }[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const successCount = data.results.filter((r) => r.success && r.error !== 'already has file').length;
      if (successCount > 0) {
        toast.success(`تم توليد ${successCount} ملف PDF بنجاح`);
      } else {
        toast.info('جميع الفواتير تحتوي على مرفقات بالفعل');
      }
    },
    onError: () => {
      toast.error('حدث خطأ أثناء توليد ملفات PDF');
    },
  });
};
