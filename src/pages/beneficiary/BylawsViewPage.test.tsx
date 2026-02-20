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
import BylawsViewPage from './BylawsViewPage';

const mockedUseBylaws = vi.mocked(useBylaws);
const mockedUseAppSettings = vi.mocked(useAppSettings);

describe('BylawsViewPage', () => {
  beforeEach(() => {
    mockedUseBylaws.mockReturnValue({
      data: [
        {
          id: '1',
          part_number: 1,
          chapter_number: 1,
          part_title: 'أحكام عامة',
          chapter_title: 'الفصل الأول',
          content: 'نص تجريبي',
          sort_order: 1,
          is_visible: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as any);

    mockedUseAppSettings.mockReturnValue({
      data: { bylaws_published: 'true' },
      isLoading: false,
    } as any);
  });

  it('renders unpublished message when bylaws are hidden', () => {
    mockedUseAppSettings.mockReturnValueOnce({
      data: { bylaws_published: 'false' },
      isLoading: false,
    } as any);

    render(
      <MemoryRouter>
        <BylawsViewPage />
      </MemoryRouter>
    );

    expect(screen.getByText('اللائحة غير متاحة حالياً')).toBeInTheDocument();
  });

  it('renders published bylaws content', () => {
    render(
      <MemoryRouter>
        <BylawsViewPage />
      </MemoryRouter>
    );

    expect(screen.getByText('اللائحة التنظيمية')).toBeInTheDocument();
    expect(screen.getAllByText('الفصل الأول').length).toBeGreaterThan(0);
  });
});
