import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavLink } from './NavLink';

describe('NavLink', () => {
  it('renders link text', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavLink to="/about">حول</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('حول')).toBeInTheDocument();
  });

  it('applies base className', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavLink to="/about" className="base-class">حول</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('حول').className).toContain('base-class');
  });

  it('applies activeClassName on active route', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <NavLink to="/about" className="base" activeClassName="active-style">حول</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('حول').className).toContain('active-style');
  });

  it('does not apply activeClassName on inactive route', () => {
    render(
      <MemoryRouter initialEntries={['/other']}>
        <NavLink to="/about" className="base" activeClassName="active-style">حول</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('حول').className).not.toContain('active-style');
  });

  it('renders as anchor element', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavLink to="/test">رابط</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('رابط').tagName).toBe('A');
  });
});
