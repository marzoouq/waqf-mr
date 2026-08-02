import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    storage: { from: vi.fn() },
  },
}));

const importModule = () => import('./useInvoiceFileUtils');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getInvoiceSignedUrl', () => {
  it('يرجع الرابط عند نجاح التحقق على الخادم', async () => {
    mockInvoke.mockResolvedValue({ data: { url: 'https://signed/x.pdf' }, error: null });
    const { getInvoiceSignedUrl } = await importModule();

    await expect(getInvoiceSignedUrl('abc.pdf')).resolves.toBe('https://signed/x.pdf');
    expect(mockInvoke).toHaveBeenCalledWith('invoice-file-url', {
      body: { file_path: 'abc.pdf' },
    });
  });

  it('يرفض المسارات غير الصالحة دون إرسال طلب', async () => {
    const { getInvoiceSignedUrl } = await importModule();

    await expect(getInvoiceSignedUrl('../secret.pdf')).rejects.toThrow('مسار الملف غير صالح');
    await expect(getInvoiceSignedUrl('/etc/passwd')).rejects.toThrow('مسار الملف غير صالح');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('يترجم 403 إلى رسالة عدم الصلاحية', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { context: { status: 403 } } });
    const { getInvoiceSignedUrl } = await importModule();

    await expect(getInvoiceSignedUrl('abc.pdf')).rejects.toThrow('لا تملك صلاحية تنزيل هذه الفاتورة');
  });

  it('يترجم 404 إلى رسالة الملف غير المسجّل', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { context: { status: 404 } } });
    const { getInvoiceSignedUrl } = await importModule();

    await expect(getInvoiceSignedUrl('ghost.pdf')).rejects.toThrow('الملف غير مسجّل في النظام');
  });

  it('يمرر اسم التنزيل عند تحديده', async () => {
    mockInvoke.mockResolvedValue({ data: { url: 'https://signed/y.pdf' }, error: null });
    const { getInvoiceSignedUrl } = await importModule();

    await getInvoiceSignedUrl('abc.pdf', 'فاتورة.pdf');
    expect(mockInvoke).toHaveBeenCalledWith('invoice-file-url', {
      body: { file_path: 'abc.pdf', download: 'فاتورة.pdf' },
    });
  });
});
