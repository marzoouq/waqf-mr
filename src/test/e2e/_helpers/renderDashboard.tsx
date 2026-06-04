/**
 * E2E render helper — يجمع MemoryRouter + QueryClientProvider لاختبارات صفحات اللوحات.
 * يعتمد على إعدادات setup العامة (useAuth mock + matchMedia + ResizeObserver).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createE2eQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface RenderOptions {
  route?: string;
  queryClient?: QueryClient;
}

export function renderDashboard(ui: React.ReactElement, opts: RenderOptions = {}) {
  const qc = opts.queryClient ?? createE2eQueryClient();
  return render(
    <MemoryRouter initialEntries={[opts.route ?? '/dashboard']}>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}
