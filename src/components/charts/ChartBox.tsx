/**
 * حاوية مشتركة للرسوم البيانية — تنتظر اكتساب أبعاد فعلية قبل رندر Recharts.
 * يجب تعريف هذا المكوّن خارج أي مكوّن آخر لمنع إعادة mount عند كل re-render.
 */
import React from 'react';
import { useChartReady } from '@/hooks/ui/useChartReady';

interface ChartBoxProps {
  children: React.ReactNode;
  className?: string;
  height?: number | string;
  fallback?: React.ReactNode;
}

/**
 * ChartBox — يُستخدم بدلاً من تعريف ChartBox محلياً داخل كل مكوّن.
 * تعريفه هنا يضمن أن React لا تُعيد إنشاء نوع المكوّن عند كل re-render،
 * مما يمنع تحذير width(-1) height(-1) في Recharts.
 */
export const ChartBox: React.FC<ChartBoxProps> = ({
  children,
  className = 'h-[300px]',
  height,
  fallback = null,
}) => {
  const { ref, ready } = useChartReady();

  const style: React.CSSProperties = height !== undefined ? { height } : {};

  return (
    <div ref={ref} className={`${className} min-w-0 min-h-[1px]`} style={style}>
      {ready ? children : fallback}
    </div>
  );
};

export default ChartBox;