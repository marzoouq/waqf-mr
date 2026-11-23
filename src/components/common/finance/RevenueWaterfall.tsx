/**
 * مسار الريع — عرض التسلسل المالي بنداً بنداً بأشرطة متتالية.
 * presentational: القيم تُعرض كما تُمرَّر (من الخادم)، والأشرطة بصرية فقط.
 */
import { cn } from '@/lib/cn';
import { fmt } from '@/utils/format/format';
import { buildWaterfallBars } from '@/utils/dashboard/waterfallBars';
import type { WaterfallRow, WaterfallRowKind } from '@/types';

interface RevenueWaterfallProps {
  rows: WaterfallRow[];
  /** القيمة التي تمثّل 100% من طول الشريط (عادةً الإجمالي الشامل) */
  base: number;
  className?: string;
}

const SIGN: Record<WaterfallRowKind, { mark: string; sr: string }> = {
  plus: { mark: '+', sr: 'يُضاف' }, minus: { mark: '−', sr: 'يُخصم' }, vat: { mark: '−', sr: 'يُخصم' },
  share: { mark: '−', sr: 'يُخصم' }, subtotal: { mark: '=', sr: 'الناتج' }, total: { mark: '=', sr: 'الناتج' },
  mine: { mark: '٪', sr: 'حصتك' },
};

const TONE: Record<WaterfallRowKind, { chip: string; bar: string; value: string; row?: string }> = {
  plus: { chip: 'bg-success-muted text-success-foreground', bar: 'bg-success/70', value: 'text-foreground' },
  minus: { chip: 'bg-destructive/10 text-destructive', bar: 'bg-destructive/60', value: 'text-destructive' },
  vat: { chip: 'bg-vat-muted text-vat', bar: 'bg-vat/60', value: 'text-vat' },
  share: { chip: 'bg-bronze-soft text-bronze-foreground', bar: 'bg-bronze/70', value: 'text-bronze-foreground' },
  subtotal: { chip: 'bg-primary text-primary-foreground', bar: 'bg-primary', value: 'text-primary font-bold', row: 'bg-accent/60 font-bold' },
  total: { chip: 'bg-primary text-primary-foreground', bar: 'bg-primary', value: 'text-primary text-base font-extrabold', row: 'bg-accent font-extrabold' },
  mine: { chip: 'bg-primary text-primary-foreground', bar: 'bg-primary', value: 'text-primary text-lg font-extrabold', row: 'bg-bronze-soft font-extrabold' },
};

const RevenueWaterfall = ({ rows, base, className }: RevenueWaterfallProps) => {
  const bars = buildWaterfallBars(rows, base);
  return (
    <ol className={cn('divide-y divide-dashed divide-border/80', className)} aria-label="مسار الريع">
      {rows.map((row, i) => {
        const tone = TONE[row.kind];
        const bar = bars[i]!;
        return (
          <li
            key={`${row.kind}-${row.label}`}
            className={cn('grid grid-cols-[1fr_auto] lg:grid-cols-[minmax(200px,1.2fr)_2fr_auto] items-center gap-x-3 gap-y-1.5 px-4 sm:px-5 py-2.5 text-sm', tone.row)}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span aria-hidden="true" className={cn('w-5 h-5 rounded-md grid place-items-center text-xs font-extrabold shrink-0', tone.chip)}>
                {SIGN[row.kind].mark}
              </span>
              <span className="sr-only">{SIGN[row.kind].sr}: </span>
              <span className="min-w-0 leading-snug">{row.label}</span>
              {row.note && <bdi dir="ltr" className="num text-[11px] text-muted-foreground font-normal">{row.note}</bdi>}
              {row.flag && (
                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold', row.flag === 'unsaved' ? 'bg-destructive/10 text-destructive' : 'bg-vat-muted text-vat')}>
                  {row.flag === 'unsaved' ? 'غير محفوظ' : 'تقديري'}
                </span>
              )}
            </span>
            <span className="col-span-2 lg:col-span-1 order-3 lg:order-none relative h-1.5 lg:h-2.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
              <span className={cn('absolute inset-y-0 rounded-full', tone.bar)} style={{ right: `${bar.start}%`, width: `${Math.max(bar.width, 0.8)}%` }} />
            </span>
            <span className={cn('num text-end tabular-nums', tone.value)}>
              {fmt(row.value)} <span className="text-[11px] font-medium text-muted-foreground">ر.س</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export default RevenueWaterfall;
