import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdleTimeoutWarning from './IdleTimeoutWarning';

describe('IdleTimeoutWarning', () => {
  it('renders when open', () => {
    render(<IdleTimeoutWarning open={true} remaining={30} onStayActive={vi.fn()} />);
    expect(screen.getByText('تنبيه انتهاء الجلسة')).toBeInTheDocument();
  });

  it('shows remaining seconds', () => {
    render(<IdleTimeoutWarning open={true} remaining={15} onStayActive={vi.fn()} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders continue button', () => {
    render(<IdleTimeoutWarning open={true} remaining={30} onStayActive={vi.fn()} />);
    expect(screen.getByText('متابعة العمل')).toBeInTheDocument();
  });

  it('calls onStayActive when button clicked', async () => {
    const onStayActive = vi.fn();
    render(<IdleTimeoutWarning open={true} remaining={30} onStayActive={onStayActive} />);
    await userEvent.click(screen.getByText('متابعة العمل'));
    expect(onStayActive).toHaveBeenCalledTimes(1);
  });

  it('does not render content when closed', () => {
    render(<IdleTimeoutWarning open={false} remaining={30} onStayActive={vi.fn()} />);
    expect(screen.queryByText('تنبيه انتهاء الجلسة')).not.toBeInTheDocument();
  });
});
