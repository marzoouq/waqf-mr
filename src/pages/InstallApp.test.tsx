import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InstallApp from './InstallApp';

describe('InstallApp', () => {
  it('يرندر بنجاح', () => {
    const { container } = render(
      <MemoryRouter><InstallApp /></MemoryRouter>
    );
    expect(container).not.toBeNull();
  });

  it('يعرض عنوان تثبيت التطبيق', () => {
    render(<MemoryRouter><InstallApp /></MemoryRouter>);
    expect(screen.getAllByText(/تثبيت التطبيق/).length).toBeGreaterThan(0);
  });

  it('يعرض مميزات التطبيق', () => {
    render(<MemoryRouter><InstallApp /></MemoryRouter>);
    expect(screen.getAllByText(/وصول سريع/).length).toBeGreaterThan(0);
  });
});
