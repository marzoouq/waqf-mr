import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rpc } from '@/lib/api/rpc';
import { useVerifyDocumentPage } from '@/hooks/page/public/useVerifyDocumentPage';

vi.mock('@/lib/api/rpc', () => ({ rpc: vi.fn() }));

function wrapperFor(code: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/verify/document/${encodeURIComponent(code)}`]}>
          <Routes><Route path="/verify/document/:code" element={children} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('public document lookup', () => {
  beforeEach(() => vi.mocked(rpc).mockReset());

  it.each(['DOC-2026-000148', 'RPT-2026-000039', 'DV-2026-000001', 'abcdef0123456789abcdef01'])(
    'looks up printed reference or QR code %s', async (code) => {
      const document = { doc_number: code, doc_type: 'report', issued_at: '2026-11-25T00:00:00Z', page_count: 1, status: 'issued' };
      vi.mocked(rpc).mockResolvedValue([document]);
      const { result } = renderHook(() => useVerifyDocumentPage(), { wrapper: wrapperFor(code) });
      await waitFor(() => expect(result.current.document).toEqual(document));
      expect(result.current.valid).toBe(true);
      expect(rpc).toHaveBeenCalledWith('verify_issued_document', { p_code: code }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    },
  );

  it('trims surrounding whitespace before lookup', async () => {
    vi.mocked(rpc).mockResolvedValue([]);
    renderHook(() => useVerifyDocumentPage(), { wrapper: wrapperFor(' RPT-2026-000039 ') });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('verify_issued_document', { p_code: 'RPT-2026-000039' }, expect.any(Object)));
  });

  it.each(['<script>', 'a'.repeat(65), '   '])('rejects malformed input %s without lookup', (code) => {
    const { result } = renderHook(() => useVerifyDocumentPage(), { wrapper: wrapperFor(code) });
    expect(result.current.valid).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('keeps an unknown reference unverified', async () => {
    vi.mocked(rpc).mockResolvedValue([]);
    const { result } = renderHook(() => useVerifyDocumentPage(), { wrapper: wrapperFor('DOC-2026-999999') });
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.document).toBeNull();
  });
});