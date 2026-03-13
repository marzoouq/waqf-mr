import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Unauthorized from './Unauthorized';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'beneficiary', user: null, loading: false }),
}));

describe('Unauthorized', () => {
  it('يرندر بنجاح', () => {
    const { container } = render(
      <MemoryRouter><Unauthorized /></MemoryRouter>
    );
    expect(container).not.toBeNull();
  });

  it('يعرض رسالة غير مصرح', () => {
    render(<MemoryRouter><Unauthorized /></MemoryRouter>);
    expect(screen.getAllByText(/غير مصرح بالدخول/).length).toBeGreaterThan(0);
  });

  it('يعرض زر العودة للرئيسية', () => {
    render(<MemoryRouter><Unauthorized /></MemoryRouter>);
    expect(screen.getAllByText(/العودة للرئيسية/).length).toBeGreaterThan(0);
  });
});
