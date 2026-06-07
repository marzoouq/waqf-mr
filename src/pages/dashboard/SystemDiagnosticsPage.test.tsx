/**
 * Smoke test: SystemDiagnosticsPage
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/layout', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/layout');
  return { ...actual, DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> };
});

vi.mock('@/hooks/page/admin/management/useSystemDiagnostics', () => ({
  useSystemDiagnostics: vi.fn(() => ({
    running: false,
    runningCategory: null,
    lastRun: null,
    progress: null,
    run: vi.fn(),
    runSingle: vi.fn(),
    exportJson: vi.fn(),
    exportText: vi.fn(),
    rerunFailures: vi.fn(),
    rerunFailuresAndWarnings: vi.fn(),
    totalChecks: 0,
    failures: 0,
    warnings: 0,
    summary: { total: 0, pass: 0, warn: 0, fail: 0, info: 0, healthScore: 100 },
    allCategories: [],
    results: [],
  })),
}));

vi.mock('@/components/common/feedback/WebVitalsPanel', () => ({ default: () => null }));

import SystemDiagnosticsPage from './SystemDiagnosticsPage';

describe('SystemDiagnosticsPage', () => {
  it('renders and binds to useSystemDiagnostics', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><SystemDiagnosticsPage autoRun={false} /></MemoryRouter>
      </QueryClientProvider>,
    );
    // assert page mounted by checking any rendered Arabic anchor — use first heading on page
    expect(document.body.textContent ?? '').toContain('تشخيص');
  });
});
