import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SecurityGuard from './SecurityGuard';

describe('SecurityGuard', () => {
  it('renders nothing (returns null)', () => {
    const { container } = render(<SecurityGuard />);
    expect(container.innerHTML).toBe('');
  });

  it('prevents copy on elements with data-sensitive', () => {
    render(
      <div>
        <SecurityGuard />
        <span data-sensitive data-testid="sensitive">سري</span>
      </div>
    );
    const el = document.querySelector('[data-sensitive]')!;
    const event = new Event('copy', { bubbles: true, cancelable: true });
    const prevented = !el.dispatchEvent(event);
    expect(prevented).toBe(true);
  });

  it('allows copy on normal elements', () => {
    render(
      <div>
        <SecurityGuard />
        <span data-testid="normal">عادي</span>
      </div>
    );
    const el = document.querySelector('[data-testid="normal"]')!;
    const event = new Event('copy', { bubbles: true, cancelable: true });
    const prevented = !el.dispatchEvent(event);
    expect(prevented).toBe(false);
  });

  it('prevents drag on sensitive elements', () => {
    render(
      <div>
        <SecurityGuard />
        <span data-sensitive data-testid="drag-sensitive">سري</span>
      </div>
    );
    const el = document.querySelector('[data-sensitive]')!;
    const event = new Event('dragstart', { bubbles: true, cancelable: true });
    const prevented = !el.dispatchEvent(event);
    expect(prevented).toBe(true);
  });

  it('allows drag on normal elements', () => {
    render(
      <div>
        <SecurityGuard />
        <span data-testid="drag-normal">عادي</span>
      </div>
    );
    const el = document.querySelector('[data-testid="drag-normal"]')!;
    const event = new Event('dragstart', { bubbles: true, cancelable: true });
    const prevented = !el.dispatchEvent(event);
    expect(prevented).toBe(false);
  });

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<SecurityGuard />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('copy', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('dragstart', expect.any(Function));
    removeSpy.mockRestore();
  });
});
