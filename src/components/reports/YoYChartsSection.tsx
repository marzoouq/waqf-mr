/**
 * غلاف كسول لرسوم المقارنة السنوية — يؤجل تحميل recharts.
 */
import { lazy, Suspense } from 'react';
import type { YoYChartsSectionProps } from './YoYChartsSectionInner';

const YoYChartsSectionInner = lazy(() => import('./YoYChartsSectionInner'));

const YoYChartsSection = (props: YoYChartsSectionProps) => (
  <Suspense fallback={null}>
    <YoYChartsSectionInner {...props} />
  </Suspense>
);

export default YoYChartsSection;
