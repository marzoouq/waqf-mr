import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

// Suppress console.error from ErrorBoundary.componentDidCatch
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });

const ThrowingChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test explosion');
  return <div>مرحباً</div>;
};

describe('ErrorBoundary', () => {
  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('مرحباً')).toBeInTheDocument();
  });

  it('catches error and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
    expect(screen.getByText(/نعتذر عن هذا الخطأ/)).toBeInTheDocument();
  });

  it('shows reset button in fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /العودة للصفحة الرئيسية/ })).toBeInTheDocument();
  });

  it('navigates to home on reset button click', async () => {
    // Mock window.location
    const originalHref = window.location.href;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: originalHref },
    });

    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    await userEvent.click(screen.getByRole('button', { name: /العودة للصفحة الرئيسية/ }));
    expect(window.location.href).toBe('/');
  });

  it('logs error info via console.error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(console.error).toHaveBeenCalled();
  });
});
