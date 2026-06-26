import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadingButton from './LoadingButton';

describe('LoadingButton', () => {
  it('يعرض children في الحالة الطبيعية', () => {
    render(<LoadingButton>حفظ</LoadingButton>);
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeInTheDocument();
  });

  it('يُعطّل الزر ويُظهر loader أثناء التحميل', () => {
    render(<LoadingButton loading>حفظ</LoadingButton>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('يستخدم loadingText عند توفّره', () => {
    render(
      <LoadingButton loading loadingText="جارٍ الحفظ...">
        حفظ
      </LoadingButton>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('جارٍ الحفظ...');
  });

  it('لا يُنفّذ onClick أثناء loading', () => {
    const onClick = vi.fn();
    render(
      <LoadingButton loading onClick={onClick}>
        حفظ
      </LoadingButton>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
