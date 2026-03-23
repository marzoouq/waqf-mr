import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// موك useWaqfInfo و useAppSettings
const mockUseWaqfInfo = vi.fn();
const mockUseAppSettings = vi.fn(() => ({ data: undefined }));
vi.mock('@/hooks/useAppSettings', () => ({
  useWaqfInfo: () => mockUseWaqfInfo(),
  useAppSettings: () => mockUseAppSettings(),
}));

// موك PdfWaqfInfo type
vi.mock('@/utils/pdf', () => ({}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('usePdfWaqfInfo', () => {
  it('يُرجع قيم فارغة عند عدم وجود بيانات', async () => {
    mockUseWaqfInfo.mockReturnValue({ data: undefined });
    const { usePdfWaqfInfo } = await import('./usePdfWaqfInfo');
    const { result } = renderHook(() => usePdfWaqfInfo(), { wrapper: createWrapper() });

    expect(result.current.waqfName).toBe('');
    expect(result.current.deedNumber).toBeUndefined();
    expect(result.current.court).toBeUndefined();
    expect(result.current.logoUrl).toBeUndefined();
    expect(result.current.vatNumber).toBeUndefined();
  });

  it('يبني deedNumber و court بالصيغة الصحيحة', async () => {
    mockUseWaqfInfo.mockReturnValue({
      data: {
        waqf_name: 'وقف الاختبار',
        waqf_deed_number: '12345',
        waqf_court: 'المحكمة العامة',
        waqf_logo_url: null,
        vat_registration_number: null,
      },
    });
    const { usePdfWaqfInfo } = await import('./usePdfWaqfInfo');
    const { result } = renderHook(() => usePdfWaqfInfo(), { wrapper: createWrapper() });

    expect(result.current.waqfName).toBe('وقف الاختبار');
    expect(result.current.deedNumber).toBe('صك رقم: 12345');
    expect(result.current.court).toBe('المحكمة: المحكمة العامة');
  });

  it('يمرر vatNumber و logoUrl من الإعدادات', async () => {
    mockUseWaqfInfo.mockReturnValue({
      data: {
        waqf_name: 'وقف',
        waqf_deed_number: null,
        waqf_court: null,
        waqf_logo_url: 'https://example.com/logo.png',
        vat_registration_number: '300000000000003',
      },
    });
    const { usePdfWaqfInfo } = await import('./usePdfWaqfInfo');
    const { result } = renderHook(() => usePdfWaqfInfo(), { wrapper: createWrapper() });

    expect(result.current.logoUrl).toBe('https://example.com/logo.png');
    expect(result.current.vatNumber).toBe('300000000000003');
  });
});
