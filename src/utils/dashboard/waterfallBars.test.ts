import { describe, it, expect } from 'vitest';
import { buildWaterfallBars } from './waterfallBars';
import type { WaterfallRow } from '@/types';

describe('buildWaterfallBars', () => {
  it('يرسم الدخل ثم المرحّل متتاليين، والمصروف يبدأ من حيث انتهى المتاح', () => {
    const rows: WaterfallRow[] = [
      { kind: 'plus', label: 'الدخل', value: 75 },
      { kind: 'plus', label: 'المرحّل', value: 25 },
      { kind: 'subtotal', label: 'الإجمالي', value: 100 },
      { kind: 'minus', label: 'المصروفات', value: 10 },
      { kind: 'vat', label: 'الضريبة', value: 5 },
      { kind: 'total', label: 'الصافي', value: 85 },
    ];
    const bars = buildWaterfallBars(rows, 100);
    expect(bars[0]).toEqual({ start: 0, width: 75 });
    expect(bars[1]).toEqual({ start: 75, width: 25 });
    expect(bars[2]).toEqual({ start: 0, width: 100 });
    expect(bars[3]).toEqual({ start: 90, width: 10 });
    expect(bars[4]).toEqual({ start: 85, width: 5 });
    expect(bars[5]).toEqual({ start: 0, width: 85 });
  });

  it('لا يرسم أي شريط عندما يكون الأساس صفراً', () => {
    expect(buildWaterfallBars([{ kind: 'total', label: 'x', value: 10 }], 0)).toEqual([{ start: 0, width: 0 }]);
  });
});
