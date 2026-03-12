import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';
import { logger } from '@/lib/logger';

// Mock logger instead of spying on console.error
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() },
}));

// Suppress React's own console.error for ErrorBoundary
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(logger.error).mockClear();
});

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
    // handleReset: first click resets state (soft recovery), child throws again.
    // Second click triggers window.location.href = '/'
    const mockHref = { href: 'http://localhost/' };
    Object.defineProperty(window, 'location', {
      writable: true,
      value: mockHref,
    });

    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    // First click: soft recovery attempt (resets state, child throws again)
    await userEvent.click(screen.getByRole('button', { name: /العودة للصفحة الرئيسية/ }));
    // Second click: hard redirect
    await userEvent.click(screen.getByRole('button', { name: /العودة للصفحة الرئيسية/ }));
    expect(window.location.href).toBe('/');
  });

  it('logs error info via logger.error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(logger.error).toHaveBeenCalledWith('ErrorBoundary caught:', expect.any(Error), expect.anything());
  });
});
