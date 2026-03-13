import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ExportMenu', () => ({
  default: () => <button>export</button>,
}));

vi.mock('@/utils/pdf', () => ({
  generateBylawsPDF: vi.fn(),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: vi.fn(() => ({ waqfName: 'وقف الاختبار' })),
}));

vi.mock('@/hooks/useBylaws', () => ({
  useBylawsList: vi.fn(),
  useCreateBylaw: vi.fn(),
  useUpdateBylaw: vi.fn(),
  useDeleteBylaw: vi.fn(),
  useReorderBylaws: vi.fn(),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(),
}));

import { useBylawsList, useCreateBylaw, useUpdateBylaw, useDeleteBylaw, useReorderBylaws } from '@/hooks/useBylaws';
import { useAppSettings } from '@/hooks/useAppSettings';
import BylawsPage from './BylawsPage';

const mockedUseBylawsList = vi.mocked(useBylawsList);
const mockedUseCreateBylaw = vi.mocked(useCreateBylaw);
const mockedUseUpdateBylaw = vi.mocked(useUpdateBylaw);
const mockedUseDeleteBylaw = vi.mocked(useDeleteBylaw);
const mockedUseReorderBylaws = vi.mocked(useReorderBylaws);
const mockedUseAppSettings = vi.mocked(useAppSettings);

const mutationStub = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false } as any;

describe('BylawsPage', () => {
  beforeEach(() => {
    mockedUseAppSettings.mockReturnValue({
      data: { bylaws_published: 'true' },
      updateSetting: { mutateAsync: vi.fn(async () => undefined) },
    } as any);

    mockedUseBylawsList.mockReturnValue({ data: [], isLoading: false } as any);
    mockedUseCreateBylaw.mockReturnValue(mutationStub);
    mockedUseUpdateBylaw.mockReturnValue(mutationStub);
    mockedUseDeleteBylaw.mockReturnValue(mutationStub);
    mockedUseReorderBylaws.mockReturnValue(mutationStub);
  });

  it('renders loading state', () => {
    mockedUseBylawsList.mockReturnValueOnce({ data: [], isLoading: true } as any);

    render(
      <MemoryRouter>
        <BylawsPage />
      </MemoryRouter>
    );

    expect(document.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('renders page header and stats when loaded', () => {
    render(
      <MemoryRouter>
        <BylawsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('اللائحة التنظيمية')).toBeInTheDocument();
    expect(screen.getByText('إجمالي البنود')).toBeInTheDocument();
    expect(screen.getByText('بنود ظاهرة')).toBeInTheDocument();
  });
});
