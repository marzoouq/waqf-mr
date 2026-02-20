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
  useBylaws: vi.fn(),
}));

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(),
}));

import { useBylaws } from '@/hooks/useBylaws';
import { useAppSettings } from '@/hooks/useAppSettings';
import BylawsPage from './BylawsPage';

const mockedUseBylaws = vi.mocked(useBylaws);
const mockedUseAppSettings = vi.mocked(useAppSettings);

describe('BylawsPage', () => {
  beforeEach(() => {
    mockedUseAppSettings.mockReturnValue({
      data: { bylaws_published: 'true' },
      updateSetting: { mutateAsync: vi.fn(async () => undefined) },
    } as any);

    mockedUseBylaws.mockReturnValue({
      data: [],
      isLoading: false,
      updateBylaw: { mutate: vi.fn() },
      reorderBylaws: { mutate: vi.fn() },
      createBylaw: { mutate: vi.fn() },
      deleteBylaw: { mutate: vi.fn() },
    } as any);
  });

  it('renders loading state', () => {
    mockedUseBylaws.mockReturnValueOnce({
      data: [],
      isLoading: true,
      updateBylaw: { mutate: vi.fn() },
      reorderBylaws: { mutate: vi.fn() },
      createBylaw: { mutate: vi.fn() },
      deleteBylaw: { mutate: vi.fn() },
    } as any);

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
