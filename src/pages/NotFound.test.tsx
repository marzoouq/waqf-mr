import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import React from 'react';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}));

import NotFound from './NotFound';

describe('NotFound page', () => {
  it('يرندر بنجاح', () => {
    const { container } = render(<NotFound />);
    expect(container).not.toBeNull();
  });

  it('يعرض رمز 404 بالأرقام العربية', () => {
    render(<NotFound />);
    expect(screen.getByText('٤٠٤')).not.toBeNull();
  });
});
