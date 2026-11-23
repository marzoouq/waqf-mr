/**
 * Today's dual-calendar label for the unified top bar (computed once per mount).
 */
import { useMemo } from 'react';
import { formatTodayLabel, type TodayLabel } from '@/utils/format/todayLabel';

export const useTodayLabel = (): TodayLabel => useMemo(() => formatTodayLabel(new Date()), []);
