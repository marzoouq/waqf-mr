import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

const mockSettings = {
  waqf_name: 'وقف الاختبار',
  waqf_founder: 'محمد',
  waqf_admin: 'أحمد',
  waqf_deed_number: '123',
  waqf_deed_date: '1440',
  waqf_nazara_number: '456',
  waqf_nazara_date: '1441',
  waqf_court: 'محكمة الرياض',
  admin_share_percentage: '10',
  waqif_share_percentage: '5',
  fiscal_year: '1446-1447',
  idle_timeout_minutes: '15',
};

const stableJsonSettings: Record<string, any> = {
  sections_visibility: { properties: true, contracts: true, income: true, expenses: true, beneficiaries: true, reports: true, accounts: true, users: true },
  beneficiary_sections: { disclosure: true, share: true, accounts: true, reports: true },
  appearance_settings: { system_name: 'إدارة الوقف', primary_color: '158 64% 25%', secondary_color: '43 74% 49%' },
  notification_settings: { contract_expiry: true, contract_expiry_days: 30, payment_delays: true, email_notifications: false },
};

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: vi.fn(() => ({
    data: mockSettings,
    isLoading: false,
    getJsonSetting: vi.fn((key: string, defaults: any) => stableJsonSettings[key] || defaults),
    updateJsonSetting: vi.fn(),
  })),
}));

vi.mock('@/hooks/useWaqfInfo', () => ({
  useWaqfInfo: vi.fn(() => ({ data: {} })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}));

import SettingsPage from './SettingsPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><SettingsPage /></MemoryRouter>
    </QueryClientProvider>
  );
};

describe('SettingsPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('الإعدادات العامة')).toBeInTheDocument();
  });

  it('renders all setting tabs', () => {
    renderPage();
    // Tab triggers use role="tab"
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(6);
    expect(screen.getByText('الأقسام')).toBeInTheDocument();
    expect(screen.getByText('المظهر')).toBeInTheDocument();
    expect(screen.getByText('الأمان')).toBeInTheDocument();
  });

  it('shows waqf data fields in default tab', () => {
    renderPage();
    expect(screen.getByText('اسم الوقف')).toBeInTheDocument();
    expect(screen.getByText('الواقف')).toBeInTheDocument();
    expect(screen.getByText('الناظر')).toBeInTheDocument();
    expect(screen.getByText('رقم صك الوقف')).toBeInTheDocument();
  });

  it('shows financial percentage fields', () => {
    renderPage();
    expect(screen.getByText('النسب المالية')).toBeInTheDocument();
    expect(screen.getByText('نسبة الناظر (%)')).toBeInTheDocument();
    expect(screen.getByText('نسبة الواقف (%)')).toBeInTheDocument();
  });

  it('shows save button', () => {
    renderPage();
    expect(screen.getByText('حفظ التغييرات')).toBeInTheDocument();
  });

  it('populates waqf name input from settings', () => {
    renderPage();
    const inputs = screen.getAllByRole('textbox');
    const waqfNameInput = inputs[0] as HTMLInputElement;
    expect(waqfNameInput.value).toBe('وقف الاختبار');
  });
});
