import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MiniSparkline from './MiniSparkline';

describe('MiniSparkline', () => {
  it('لا يعرض شيئاً عند بيانات فارغة', () => {
    const { container } = render(<MiniSparkline data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('يعرض polyline بعدد النقاط الصحيح', () => {
    const { container } = render(<MiniSparkline data={[1, 5, 3, 8, 4]} />);
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    const points = polyline?.getAttribute('points')?.split(' ') ?? [];
    expect(points).toHaveLength(5);
  });
});
