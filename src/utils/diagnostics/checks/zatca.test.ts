/**
 * اختبارات فحوصات ZATCA التشخيصية
 *
 * تركز على المنطق الزمني للشهادة وكشف انكسار سلسلة الفواتير
 * (الأكثر عرضة للأخطاء الصامتة).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/services/diagnosticsService', () => ({
  getActiveCertificate: vi.fn(),
  getInvoiceChainRecords: vi.fn(),
  countPendingChainRecords: vi.fn(),
  countUnsubmittedInvoices: vi.fn(),
  getRequiredSettings: vi.fn(),
  getOtpSettings: vi.fn(),
  getInvoiceChainCompleteness: vi.fn(),
}));

import {
  checkZatcaCertificateValidity,
  checkInvoiceChainIntegrity,
  checkPendingInvoiceChains,
  checkUnsubmittedInvoices,
  checkZatcaSettings,
} from './zatca';
import * as svc from '@/lib/services/diagnosticsService';

beforeEach(() => {
  vi.clearAllMocks();
});

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

describe('checkZatcaCertificateValidity', () => {
  it('warn عند غياب شهادة نشطة', async () => {
    vi.mocked(svc.getActiveCertificate).mockResolvedValue({ data: null, error: null } as never);
    const r = await checkZatcaCertificateValidity();
    expect(r.status).toBe('warn');
  });

  it('fail عند شهادة منتهية', async () => {
    vi.mocked(svc.getActiveCertificate).mockResolvedValue({
      data: { certificate_type: 'production', expires_at: daysFromNow(-5) },
      error: null,
    } as never);
    const r = await checkZatcaCertificateValidity();
    expect(r.status).toBe('fail');
    expect(r.detail).toMatch(/منتهية/);
  });

  it('warn عند شهادة قاربت على الانتهاء (<14 يوم)', async () => {
    vi.mocked(svc.getActiveCertificate).mockResolvedValue({
      data: { certificate_type: 'production', expires_at: daysFromNow(7) },
      error: null,
    } as never);
    const r = await checkZatcaCertificateValidity();
    expect(r.status).toBe('warn');
  });

  it('pass عند شهادة سارية >14 يوم', async () => {
    vi.mocked(svc.getActiveCertificate).mockResolvedValue({
      data: { certificate_type: 'production', expires_at: daysFromNow(180) },
      error: null,
    } as never);
    const r = await checkZatcaCertificateValidity();
    expect(r.status).toBe('pass');
  });

  it('info عند رمي استثناء (شبكة) — لا يُلصق "منتهية"', async () => {
    vi.mocked(svc.getActiveCertificate).mockRejectedValue(new Error('Network down'));
    const r = await checkZatcaCertificateValidity();
    expect(r.status).toBe('info');
    expect(r.detail).not.toMatch(/منتهية/);
  });
});

describe('checkInvoiceChainIntegrity', () => {
  it('pass على سلسلة سليمة', async () => {
    vi.mocked(svc.getInvoiceChainRecords).mockResolvedValue({
      data: [
        { icv: 1, invoice_hash: 'h1', previous_hash: '0' },
        { icv: 2, invoice_hash: 'h2', previous_hash: 'h1' },
        { icv: 3, invoice_hash: 'h3', previous_hash: 'h2' },
      ],
      error: null,
    } as never);
    const r = await checkInvoiceChainIntegrity();
    expect(r.status).toBe('pass');
  });

  it('fail عند انكسار سلسلة الهاش', async () => {
    vi.mocked(svc.getInvoiceChainRecords).mockResolvedValue({
      data: [
        { icv: 1, invoice_hash: 'h1', previous_hash: '0' },
        { icv: 2, invoice_hash: 'h2', previous_hash: 'WRONG' },
      ],
      error: null,
    } as never);
    const r = await checkInvoiceChainIntegrity();
    expect(r.status).toBe('fail');
    expect(r.detail).toMatch(/مكسور/);
  });

  it('warn عند فجوة في تسلسل ICV فقط', async () => {
    vi.mocked(svc.getInvoiceChainRecords).mockResolvedValue({
      data: [
        { icv: 1, invoice_hash: 'h1', previous_hash: '0' },
        { icv: 5, invoice_hash: 'h2', previous_hash: 'h1' },
      ],
      error: null,
    } as never);
    const r = await checkInvoiceChainIntegrity();
    expect(r.status).toBe('warn');
  });

  it('info على سلسلة فارغة', async () => {
    vi.mocked(svc.getInvoiceChainRecords).mockResolvedValue({ data: [], error: null } as never);
    const r = await checkInvoiceChainIntegrity();
    expect(r.status).toBe('info');
  });
});

describe('checkPendingInvoiceChains', () => {
  it('pass عند صفر سجلات معلّقة', async () => {
    vi.mocked(svc.countPendingChainRecords).mockResolvedValue({ count: 0, error: null } as never);
    expect((await checkPendingInvoiceChains()).status).toBe('pass');
  });

  it('warn عند وجود سجلات معلّقة', async () => {
    vi.mocked(svc.countPendingChainRecords).mockResolvedValue({ count: 3, error: null } as never);
    expect((await checkPendingInvoiceChains()).status).toBe('warn');
  });
});

describe('checkUnsubmittedInvoices', () => {
  it('pass عند صفر فواتير غير مُبلّغة', async () => {
    vi.mocked(svc.countUnsubmittedInvoices).mockResolvedValue({ count: 0, error: null } as never);
    expect((await checkUnsubmittedInvoices()).status).toBe('pass');
  });

  it('warn عند 1-10 فواتير غير مُبلّغة', async () => {
    vi.mocked(svc.countUnsubmittedInvoices).mockResolvedValue({ count: 5, error: null } as never);
    expect((await checkUnsubmittedInvoices()).status).toBe('warn');
  });

  it('fail عند >10 فواتير غير مُبلّغة', async () => {
    vi.mocked(svc.countUnsubmittedInvoices).mockResolvedValue({ count: 15, error: null } as never);
    expect((await checkUnsubmittedInvoices()).status).toBe('fail');
  });
});

describe('checkZatcaSettings', () => {
  it('pass عند توفر كل المفاتيح المطلوبة', async () => {
    vi.mocked(svc.getRequiredSettings).mockResolvedValue({
      data: [
        { key: 'vat_registration_number' },
        { key: 'waqf_name' },
        { key: 'commercial_registration_number' },
      ],
      error: null,
    } as never);
    expect((await checkZatcaSettings()).status).toBe('pass');
  });

  it('fail مع سرد المفاتيح الناقصة', async () => {
    vi.mocked(svc.getRequiredSettings).mockResolvedValue({
      data: [{ key: 'waqf_name' }],
      error: null,
    } as never);
    const r = await checkZatcaSettings();
    expect(r.status).toBe('fail');
    expect(r.detail).toMatch(/الرقم الضريبي/);
    expect(r.detail).toMatch(/السجل التجاري/);
  });
});
